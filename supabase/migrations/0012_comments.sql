-- 경기 코멘트(운영진 총평) + 회원 댓글/답글 + 좋아요

-- 1) 운영진 코멘트 (경기당 1개)
create table if not exists match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  author_id uuid references members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table match_comments enable row level security;
create policy match_comments_select on match_comments for select to authenticated using (true);
create policy match_comments_write on match_comments for all to authenticated
  using (is_manager()) with check (is_manager());

-- 2) 회원 댓글/답글 (parent_id 있으면 답글)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  author_id uuid not null references members(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_match_idx on comments(match_id);
alter table comments enable row level security;
create policy comments_select on comments for select to authenticated using (true);
create policy comments_insert on comments for insert to authenticated
  with check (author_id = current_member_id());
create policy comments_update on comments for update to authenticated
  using (author_id = current_member_id()) with check (author_id = current_member_id());
create policy comments_delete on comments for delete to authenticated
  using (author_id = current_member_id() or is_manager());

-- 3) 좋아요 (코멘트글 'post' + 댓글 'comment' 공용)
create table if not exists comment_likes (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('post', 'comment')),
  target_id uuid not null,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (target, target_id, member_id)
);
create index if not exists comment_likes_target_idx on comment_likes(target_id);
alter table comment_likes enable row level security;
create policy comment_likes_select on comment_likes for select to authenticated using (true);
create policy comment_likes_write on comment_likes for all to authenticated
  using (member_id = current_member_id()) with check (member_id = current_member_id());
