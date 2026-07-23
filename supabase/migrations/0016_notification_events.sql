-- 푸시와 알림함을 동일한 이벤트 기준으로 관리한다.
create table notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('notice', 'match', 'reminder', 'lineup', 'result', 'approval')),
  reference_id uuid not null,
  title text not null,
  body text not null,
  url text not null,
  audience text not null check (audience in ('all', 'managers', 'members')),
  member_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (kind, reference_id)
);

create index notification_events_created_at_idx on notification_events (created_at desc);
create index notification_events_member_ids_idx on notification_events using gin (member_ids);

alter table notification_events enable row level security;

create policy notification_events_select on notification_events for select to authenticated
  using (
    audience = 'all'
    or (audience = 'managers' and is_manager())
    or (audience = 'members' and current_member_id() = any(member_ids))
  );

create policy notification_events_manage on notification_events for all to authenticated
  using (is_manager()) with check (is_manager());

-- 가입 신청자는 운영진 전용 알림을 직접 구성할 수 없고 본인의 신청 알림만 기록한다.
create or replace function record_signup_notification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant_name text;
begin
  select claimed_name into applicant_name
  from profiles
  where id = auth.uid();

  if applicant_name is null or btrim(applicant_name) = '' then
    return;
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
end;
$$;

grant execute on function record_signup_notification() to authenticated;

-- 배포 직후에도 기존 최근 알림이 비지 않도록 확인 가능한 원본 데이터를 7일치 이관한다.
insert into notification_events (kind, reference_id, title, body, url, audience, created_at)
select
  'notice', n.id, n.title, '새 공지가 등록됐어요', '/notices/' || n.id, 'all', n.created_at
from notices n
where n.created_at >= now() - interval '7 days'
on conflict (kind, reference_id) do nothing;

insert into notification_events (kind, reference_id, title, body, url, audience, created_at)
select
  'match', m.id,
  case when m.type = 'self' then m.opponent || ' 경기가 등록됐어요' else 'vs ' || m.opponent || ' 경기가 등록됐어요' end,
  m.match_date::text || coalesce(' · ' || m.match_time::text, '') || ' · 참석 여부를 알려주세요',
  '/matches/' || m.id, 'all', m.created_at
from matches m
where m.created_at >= now() - interval '7 days'
on conflict (kind, reference_id) do nothing;

insert into notification_events (kind, reference_id, title, body, url, audience, created_at)
select
  'approval', p.id, '새 가입 신청', p.claimed_name || ' 님이 승인을 기다리고 있어요',
  '/admin/approvals', 'managers', p.created_at
from profiles p
where p.member_id is null
  and p.claimed_name is not null
  and p.created_at >= now() - interval '7 days'
on conflict (kind, reference_id) do nothing;

insert into notification_events (kind, reference_id, title, body, url, audience, member_ids, created_at)
select
  'lineup', f.match_id, '라인업이 등록됐어요', '이번 경기 포메이션과 쿼터별 배치를 확인하세요',
  '/matches/' || f.match_id || '/formation', 'members',
  coalesce(array_agg(a.member_id) filter (where a.member_id is not null), '{}'), f.created_at
from formations f
left join attendances a on a.match_id = f.match_id and a.status = 'going'
where f.created_at >= now() - interval '7 days'
group by f.match_id, f.created_at
on conflict (kind, reference_id) do nothing;

insert into notification_events (kind, reference_id, title, body, url, audience, member_ids, created_at)
select
  'result', m.id,
  case when m.type = 'self' then m.opponent || ' 경기 결과' else 'vs ' || m.opponent || ' 경기 결과' end,
  m.score_for || ' : ' || m.score_against || ' · MOM 투표에 참여해주세요',
  '/matches/' || m.id, 'members',
  coalesce(array_agg(a.member_id) filter (where a.member_id is not null), '{}'),
  m.mom_vote_close - interval '1 hour'
from matches m
left join attendances a on a.match_id = m.id and a.status = 'going'
where m.score_for is not null
  and m.score_against is not null
  and m.mom_vote_close is not null
  and m.mom_vote_close - interval '1 hour' >= now() - interval '7 days'
group by m.id
on conflict (kind, reference_id) do nothing;
