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
