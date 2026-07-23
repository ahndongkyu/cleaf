-- 경기 취소 기록: 일정은 보존하고 취소 사유만 별도로 남긴다.
alter table matches
  add column if not exists cancel_reason text;

-- 취소 알림을 알림함에도 남길 수 있도록 이벤트 종류를 확장한다.
alter table notification_events
  drop constraint if exists notification_events_kind_check;

alter table notification_events
  add constraint notification_events_kind_check
  check (kind in ('notice', 'match', 'reminder', 'lineup', 'result', 'approval', 'cancelled'));
