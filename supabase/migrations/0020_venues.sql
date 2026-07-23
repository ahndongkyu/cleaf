-- 운영진이 관리하는 경기장 목록
create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  constraint venues_name_not_blank check (btrim(name) <> ''),
  constraint venues_address_not_blank check (btrim(address) <> '')
);

create unique index if not exists venues_name_address_unique
  on venues (lower(btrim(name)), lower(btrim(address)));

alter table venues enable row level security;

create policy venues_select on venues for select to authenticated using (true);
create policy venues_write on venues for all to authenticated
  using (is_manager()) with check (is_manager());
