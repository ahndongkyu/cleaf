-- 자체전 득점·도움을 레드/블루 및 용병까지 기록할 수 있도록 확장한다.
alter table goals add column if not exists team_side text;
alter table goals add column if not exists scorer_guest_id uuid references guests(id) on delete set null;
alter table goals add column if not exists assist_guest_id uuid references guests(id) on delete set null;

alter table goals drop constraint if exists goals_team_side_check;
alter table goals add constraint goals_team_side_check
  check (team_side is null or team_side in ('red', 'sky'));

-- 기존 자체전 회원 득점은 당시 참석 팀을 기준으로 보정한다.
update goals as g
set team_side = a.team_side
from matches as m, attendances as a
where g.match_id = m.id
  and m.type = 'self'
  and a.match_id = g.match_id
  and a.member_id = g.scorer_id
  and a.team_side in ('red', 'sky')
  and g.team_side is null;

create index if not exists goals_match_team_side_idx on goals (match_id, team_side);
