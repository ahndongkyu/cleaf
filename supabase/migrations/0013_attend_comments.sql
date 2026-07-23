-- 참석 투표 댓글 (미정/상황 공유용, 대댓글 없음)
create table if not exists attend_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists attend_comments_match_idx on attend_comments(match_id);
alter table attend_comments enable row level security;
create policy attend_comments_select on attend_comments for select to authenticated using (true);
create policy attend_comments_insert on attend_comments for insert to authenticated
  with check (author_id = current_member_id());
create policy attend_comments_delete on attend_comments for delete to authenticated
  using (author_id = current_member_id() or is_manager());
