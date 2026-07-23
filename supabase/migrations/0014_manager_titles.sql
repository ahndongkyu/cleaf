-- 운영진 세부 직책 (감독/총무/주장 등) — 권한 동일, 표시용

-- 회원별 직책 라벨
alter table members add column if not exists title text;

-- 직책 목록 (운영진이 추가/삭제)
create table if not exists manager_titles (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table manager_titles enable row level security;
create policy manager_titles_select on manager_titles for select to authenticated using (true);
create policy manager_titles_write on manager_titles for all to authenticated
  using (is_manager()) with check (is_manager());
