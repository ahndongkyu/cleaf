-- 계정 연결·참석 팀 배정·MOM 투표 권한을 DB에서 강제한다.

begin;

-- 한 로스터 회원에는 하나의 로그인 프로필만 연결할 수 있다.
do $$
begin
  if exists (
    select member_id
    from profiles
    where member_id is not null
    group by member_id
    having count(*) > 1
  ) then
    raise exception 'profiles.member_id 중복 연결을 먼저 정리해야 합니다.';
  end if;
end;
$$;

create unique index if not exists profiles_member_id_unique
  on profiles (member_id)
  where member_id is not null;

-- 일반 사용자는 자신의 가입 신청 정보만 수정할 수 있고 계정 연결은 운영진만 변경한다.
create or replace function protect_profile_member_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and not is_manager()
     and new.member_id is distinct from old.member_id then
    raise exception 'member_id는 운영진만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_member_link on profiles;
create trigger profiles_protect_member_link
before update on profiles
for each row execute function protect_profile_member_link();

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 일반 회원은 참석 상태만 바꿀 수 있다. 팀·출처·용병 여부는 운영진 관리 값이다.
create or replace function protect_attendance_managed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or is_manager() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.source := 'self';
    new.is_guest := false;
    new.team_side := null;
    return new;
  end if;

  new.match_id := old.match_id;
  new.member_id := old.member_id;
  new.source := old.source;
  new.is_guest := old.is_guest;
  new.team_side := old.team_side;
  return new;
end;
$$;

drop trigger if exists attendances_protect_managed_fields on attendances;
create trigger attendances_protect_managed_fields
before insert or update on attendances
for each row execute function protect_attendance_managed_fields();

drop policy if exists attendances_update on attendances;
create policy attendances_update on attendances for update to authenticated
  using (is_manager() or member_id = current_member_id())
  with check (is_manager() or member_id = current_member_id());

-- 투표자와 대상이 모두 실제 참석자이고 결과 입력 후 마감 전일 때만 MOM 투표를 허용한다.
create or replace function can_cast_mvp_vote(
  requested_match_id uuid,
  requested_voter_id uuid,
  requested_target_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    requested_voter_id = current_member_id()
    and exists (
      select 1
      from matches m
      where m.id = requested_match_id
        and m.status = 'past'
        and m.score_for is not null
        and m.score_against is not null
        and m.mom_vote_close is not null
        and now() < m.mom_vote_close
    )
    and exists (
      select 1
      from attendances a
      where a.match_id = requested_match_id
        and a.member_id = requested_voter_id
        and a.status = 'going'
    )
    and exists (
      select 1
      from attendances a
      where a.match_id = requested_match_id
        and a.member_id = requested_target_id
        and a.status = 'going'
    );
$$;

revoke all on function can_cast_mvp_vote(uuid, uuid, uuid) from public;
grant execute on function can_cast_mvp_vote(uuid, uuid, uuid) to authenticated;

drop policy if exists mvp_insert on mvp_votes;
create policy mvp_insert on mvp_votes for insert to authenticated
  with check (can_cast_mvp_vote(match_id, voter_id, target_id));

drop policy if exists mvp_update on mvp_votes;
create policy mvp_update on mvp_votes for update to authenticated
  using (voter_id = current_member_id())
  with check (can_cast_mvp_vote(match_id, voter_id, target_id));

-- 가입 알림은 계정별 5분에 한 번만 새로 기록한다.
drop function if exists record_signup_notification();
create function record_signup_notification()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant_name text;
  last_recorded_at timestamptz;
begin
  select claimed_name into applicant_name
  from profiles
  where id = auth.uid()
    and member_id is null;

  if applicant_name is null or btrim(applicant_name) = '' then
    return false;
  end if;

  select created_at into last_recorded_at
  from notification_events
  where kind = 'approval'
    and reference_id = auth.uid();

  if last_recorded_at is not null
     and last_recorded_at > now() - interval '5 minutes' then
    return false;
  end if;

  insert into notification_events (
    kind, reference_id, title, body, url, audience, member_ids, created_at
  ) values (
    'approval', auth.uid(), '새 가입 신청', applicant_name || ' 님이 승인을 기다리고 있어요',
    '/admin/approvals', 'managers', '{}', now()
  )
  on conflict (kind, reference_id) do update set
    title = excluded.title,
    body = excluded.body,
    created_at = excluded.created_at;

  return true;
end;
$$;

revoke all on function record_signup_notification() from public;
grant execute on function record_signup_notification() to authenticated;

-- 가입 승인 과정(회원·등번호·프로필 연결)을 한 트랜잭션으로 처리한다.
create or replace function link_signup_profile(
  requested_profile_id uuid,
  requested_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant_name text;
  roster_name text;
begin
  if not is_manager() then
    raise exception '운영진만 가입을 승인할 수 있습니다.';
  end if;

  select claimed_name into applicant_name
  from profiles
  where id = requested_profile_id
    and member_id is null
  for update;

  select name into roster_name
  from members
  where id = requested_member_id;

  if applicant_name is null or roster_name is null
     or lower(regexp_replace(applicant_name, '\s+', '', 'g'))
        <> lower(regexp_replace(roster_name, '\s+', '', 'g')) then
    return false;
  end if;

  update profiles
  set member_id = requested_member_id,
      signup_rejected_at = null
  where id = requested_profile_id
    and member_id is null;

  return found;
end;
$$;

revoke all on function link_signup_profile(uuid, uuid) from public;
grant execute on function link_signup_profile(uuid, uuid) to authenticated;

create or replace function create_member_from_signup(requested_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant profiles%rowtype;
  created_member_id uuid;
begin
  if not is_manager() then
    raise exception '운영진만 가입을 승인할 수 있습니다.';
  end if;

  select * into applicant
  from profiles
  where id = requested_profile_id
    and member_id is null
  for update;

  if applicant.id is null
     or applicant.claimed_name is null
     or char_length(btrim(applicant.claimed_name)) not between 1 and 40
     or applicant.claimed_position1 is null
     or applicant.claimed_position1 not in ('FW', 'MF', 'DF', 'GK')
     or (applicant.claimed_position1 <> 'GK' and applicant.claimed_position2 is null)
     or (applicant.claimed_position1 = 'FW' and applicant.claimed_position2 not in ('WF', 'CF'))
     or (applicant.claimed_position1 = 'MF' and applicant.claimed_position2 not in ('CAM', 'CM', 'CDM'))
     or (applicant.claimed_position1 = 'DF' and applicant.claimed_position2 not in ('SB', 'CB'))
     or applicant.claimed_num_red is null
     or applicant.claimed_num_blue is null
     or applicant.claimed_num_red not between 0 and 99
     or applicant.claimed_num_blue not between 0 and 99 then
    return null;
  end if;

  if exists (
    select 1
    from members m
    where lower(regexp_replace(m.name, '\s+', '', 'g'))
      = lower(regexp_replace(applicant.claimed_name, '\s+', '', 'g'))
  ) then
    return null;
  end if;

  insert into members (name, position1, position2, role)
  values (
    applicant.claimed_name,
    applicant.claimed_position1::position_code,
    applicant.claimed_position2,
    'member'
  )
  returning id into created_member_id;

  insert into member_numbers (member_id, uniform, number)
  values
    (created_member_id, '빨흰', applicant.claimed_num_red),
    (created_member_id, '스카이', applicant.claimed_num_blue);

  update profiles
  set member_id = created_member_id,
      signup_rejected_at = null
  where id = requested_profile_id;

  return created_member_id;
end;
$$;

revoke all on function create_member_from_signup(uuid) from public;
grant execute on function create_member_from_signup(uuid) to authenticated;

-- 점수 확정과 용병 익명화를 한 트랜잭션으로 처리한다.
create or replace function finalize_match_result(
  requested_match_id uuid,
  requested_score_for integer,
  requested_score_against integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_manager() then
    raise exception '운영진만 결과를 저장할 수 있습니다.';
  end if;

  if requested_score_for not between 0 and 99
     or requested_score_against not between 0 and 99 then
    return false;
  end if;

  update matches
  set score_for = requested_score_for,
      score_against = requested_score_against,
      status = 'past',
      mom_vote_close = coalesce(mom_vote_close, now() + interval '1 hour')
  where id = requested_match_id
    and status <> 'cancelled';

  if not found then
    return false;
  end if;

  update guests
  set name = '용병'
  where match_id = requested_match_id
    and name <> '용병';

  return true;
end;
$$;

revoke all on function finalize_match_result(uuid, integer, integer) from public;
grant execute on function finalize_match_result(uuid, integer, integer) to authenticated;

-- 운영진 푸시 구독 정보는 더 이상 일반 authenticated RPC로 반환하지 않는다.
revoke all on function manager_push_subs() from authenticated;
drop function if exists manager_push_subs();

commit;
