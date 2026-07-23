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
