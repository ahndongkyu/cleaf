-- 자체전 레드/스카이 팀 배정과 팀별 포메이션
alter table attendances add column if not exists team_side text;
alter table guests add column if not exists team_side text;
alter table formations add column if not exists team_side text;

update formations set team_side = 'all' where team_side is null;
alter table formations alter column team_side set default 'all';
alter table formations alter column team_side set not null;

alter table attendances drop constraint if exists attendances_team_side_check;
alter table attendances add constraint attendances_team_side_check
  check (team_side is null or team_side in ('red', 'sky'));

alter table guests drop constraint if exists guests_team_side_check;
alter table guests add constraint guests_team_side_check
  check (team_side is null or team_side in ('red', 'sky'));

alter table formations drop constraint if exists formations_team_side_check;
alter table formations add constraint formations_team_side_check
  check (team_side in ('all', 'red', 'sky'));

-- 기존 중복 포메이션이 있으면 가장 최근 행만 유지한다.
delete from formations older
using formations newer
where older.match_id = newer.match_id
  and older.team_side = newer.team_side
  and (older.created_at, older.id) < (newer.created_at, newer.id);

create unique index if not exists formations_match_team_unique
  on formations (match_id, team_side);
