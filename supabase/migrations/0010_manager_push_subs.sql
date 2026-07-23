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
