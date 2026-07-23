-- CLEAR FC 전체 스키마 (마이그레이션 0001~0010 통합) — 새 프로젝트 SQL Editor에 붙여넣고 Run

-- ===== 0001_init.sql =====
-- ============================================================
-- CLEAR FC 초기 스키마 (members 로스터 + auth 연동 profiles + 도메인 테이블 + RLS)
-- Supabase SQL Editor에 붙여넣고 Run.
-- ============================================================

-- ---------- ENUMS ----------
create type member_role as enum ('member', 'manager', 'admin');
create type position_code as enum ('GK', 'DF', 'MF', 'FW');
create type match_type as enum ('match', 'self');
create type attend_status as enum ('going', 'notGoing', 'undecided');
create type attend_source as enum ('self', 'manager');

-- ---------- MEMBERS (운영진이 관리하는 로스터) ----------
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  position1 position_code not null default 'MF',
  position2 position_code,
  role member_role not null default 'member',
  photo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- 유니폼별 등번호
create table member_numbers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  uniform text not null,
  number int not null
);

-- ---------- PROFILES (auth.users 연동 / 승인 매핑) ----------
-- 카카오 로그인 시 트리거로 자동 생성. member_id가 null이면 "승인 대기".
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  kakao_nickname text,
  member_id uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- MATCHES ----------
create table matches (
  id uuid primary key default gen_random_uuid(),
  opponent text not null,
  match_date date not null,
  match_time text,
  place text,
  place_lat double precision,
  place_lng double precision,
  type match_type not null default 'match',
  uniform text,
  score_for int,
  score_against int,
  youtube_url text,
  mvp_member_id uuid references members(id) on delete set null,
  status text not null default 'upcoming',
  cancel_reason text,
  created_at timestamptz not null default now()
);

-- ---------- ATTENDANCES (참석 RSVP — 핵심 허브) ----------
create table attendances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status attend_status not null default 'undecided',
  source attend_source not null default 'self',
  is_guest boolean not null default false,
  unique (match_id, member_id)
);

-- ---------- GOALS (우리 득점 상세) ----------
create table goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  scorer_id uuid references members(id) on delete set null,
  assist_id uuid references members(id) on delete set null,
  is_own_goal boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- FORMATIONS ----------
create table formations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  name text not null default '4-3-3',
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- MVP VOTES ----------
create table mvp_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  voter_id uuid not null references members(id) on delete cascade,
  target_id uuid not null references members(id) on delete cascade,
  unique (match_id, voter_id)
);

-- ---------- NOTICES ----------
create table notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  author_id uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 헬퍼 함수 (RLS 재귀 방지 위해 SECURITY DEFINER)
-- ============================================================
create or replace function current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select member_id from profiles where id = auth.uid();
$$;

create or replace function app_role()
returns member_role language sql stable security definer set search_path = public as $$
  select m.role from members m
  join profiles p on p.member_id = m.id
  where p.id = auth.uid();
$$;

create or replace function is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('manager', 'admin'), false);
$$;

-- ============================================================
-- 카카오 로그인 시 profiles 자동 생성 트리거
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, kakao_nickname)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'preferred_username')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table members enable row level security;
alter table member_numbers enable row level security;
alter table profiles enable row level security;
alter table matches enable row level security;
alter table attendances enable row level security;
alter table goals enable row level security;
alter table formations enable row level security;
alter table mvp_votes enable row level security;
alter table notices enable row level security;

-- PROFILES: 본인 조회/수정, 운영진은 전체 조회/수정(승인 매핑)
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_manager());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid());
create policy profiles_update_manager on profiles for update to authenticated
  using (is_manager());

-- MEMBERS: 로그인 회원 전체 조회, 운영진만 쓰기
create policy members_select on members for select to authenticated using (true);
create policy members_write on members for all to authenticated
  using (is_manager()) with check (is_manager());

-- MEMBER_NUMBERS
create policy member_numbers_select on member_numbers for select to authenticated using (true);
create policy member_numbers_write on member_numbers for all to authenticated
  using (is_manager()) with check (is_manager());

-- MATCHES
create policy matches_select on matches for select to authenticated using (true);
create policy matches_write on matches for all to authenticated
  using (is_manager()) with check (is_manager());

-- ATTENDANCES: 조회 전체, 본인 것은 본인이, 그 외엔 운영진(대리/게스트)
create policy attendances_select on attendances for select to authenticated using (true);
create policy attendances_insert on attendances for insert to authenticated
  with check (is_manager() or member_id = current_member_id());
create policy attendances_update on attendances for update to authenticated
  using (is_manager() or member_id = current_member_id());
create policy attendances_delete on attendances for delete to authenticated
  using (is_manager());

-- GOALS / FORMATIONS / NOTICES: 조회 전체, 쓰기 운영진
create policy goals_select on goals for select to authenticated using (true);
create policy goals_write on goals for all to authenticated
  using (is_manager()) with check (is_manager());

create policy formations_select on formations for select to authenticated using (true);
create policy formations_write on formations for all to authenticated
  using (is_manager()) with check (is_manager());

create policy notices_select on notices for select to authenticated using (true);
create policy notices_write on notices for all to authenticated
  using (is_manager()) with check (is_manager());

-- MVP_VOTES: 조회 전체, 본인 투표만 작성/수정
create policy mvp_select on mvp_votes for select to authenticated using (true);
create policy mvp_insert on mvp_votes for insert to authenticated
  with check (voter_id = current_member_id());
create policy mvp_update on mvp_votes for update to authenticated
  using (voter_id = current_member_id());
create policy mvp_manage on mvp_votes for delete to authenticated
  using (is_manager());


-- ===== 0002_guests.sql =====
-- 매치별 용병(게스트) — 명단(members) 회원이 아닌 임시 참가자
-- Supabase SQL Editor에 붙여넣고 Run.

create table guests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  name text not null,
  position1 position_code not null default 'MF',
  created_at timestamptz not null default now()
);

alter table guests enable row level security;

create policy guests_select on guests for select to authenticated using (true);
create policy guests_write on guests for all to authenticated
  using (is_manager()) with check (is_manager());


-- ===== 0003_push.sql =====
-- 웹 푸시 구독 저장. Supabase SQL Editor에 붙여넣고 Run.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- 본인 구독은 본인이 관리
create policy push_own on push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- 운영진은 발송을 위해 전체 조회 가능
create policy push_manager_read on push_subscriptions for select to authenticated
  using (is_manager());


-- ===== 0004_mom.sql =====
-- MOM 투표 마감시각. 결과 입력 시점 + 1시간으로 설정됨.
-- Supabase SQL Editor에 붙여넣고 Run.

alter table matches add column if not exists mom_vote_close timestamptz;


-- ===== 0005_detail_position.sql =====
-- 상세 포지션(WF/CF/CAM/CM/CDM/SB/CB)을 position2에 저장할 수 있게 enum → text 전환
alter table members alter column position2 type text using position2::text;


-- ===== 0006_claimed_name.sql =====
-- 카카오 가입자가 입력한 본인 이름 (운영진 승인 화면에서 로스터 자동 매칭용)
alter table profiles add column if not exists claimed_name text;


-- ===== 0007_place_address.sql =====
-- 매치 장소 상세 주소 (선택) — 홈 다음경기에서 탭하면 클립보드 복사
alter table matches add column if not exists place_address text;


-- ===== 0008_place_coords.sql =====
-- 매치 장소 좌표 (카카오 장소검색에서 저장) — 날씨 정확도용
alter table matches add column if not exists place_lat double precision;
alter table matches add column if not exists place_lng double precision;


-- ===== 0009_self_edit.sql =====
-- 회원 본인이 자기 프로필 수정 허용 (권한 변경은 운영진만 — 권한 상승 방지)

-- 본인(=연결된 member)만 members 행 UPDATE 허용 (기존 members_write=운영진 정책과 OR)
create policy members_update_self on members for update to authenticated
  using (id = current_member_id())
  with check (id = current_member_id());

-- 비운영진이 role/status를 바꾸려 해도 원래 값으로 강제 (UI 우회 방지)
create or replace function protect_member_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists members_protect_role on members;
create trigger members_protect_role before update on members
  for each row execute function protect_member_role();

-- 본인 등번호 관리 허용 (기존 member_numbers_write=운영진 정책과 OR)
create policy member_numbers_self on member_numbers for all to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());


-- ===== 0010_manager_push_subs.sql =====
-- 가입 신청 시 운영진/관리자에게 푸시 발송용.
-- 신청자(비운영진) 세션에서는 RLS상 운영진 구독을 못 읽으므로,
-- security definer 함수로 운영진/관리자 구독만 반환한다.
-- (구독 endpoint/key는 우리 VAPID 개인키 없이는 발송에 쓸 수 없어 노출 위험이 낮다)

create or replace function manager_push_subs()
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from push_subscriptions ps
  join profiles p on p.id = ps.profile_id
  join members m on m.id = p.member_id
  where m.role in ('manager', 'admin');
$$;

grant execute on function manager_push_subs() to authenticated;
