-- 공지 조회 수는 로그인 회원별 최초 열람 1회만 집계한다.
alter table notices
  add column view_count integer not null default 0 check (view_count >= 0);

create table notice_views (
  notice_id uuid not null references notices(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (notice_id, member_id)
);

alter table notice_views enable row level security;

create policy notice_views_insert_self on notice_views for insert to authenticated
  with check (member_id = current_member_id());

create or replace function increment_notice_view_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update notices
  set view_count = view_count + 1
  where id = new.notice_id;

  return new;
end;
$$;

create trigger notice_view_count_increment
after insert on notice_views
for each row execute function increment_notice_view_count();
