-- 운영 데이터 정합성 점검용 읽기 전용 쿼리.
-- 결과가 모두 0이면 아래 항목에 알려진 이상 데이터가 없는 상태다.

select 'duplicate_profile_member_links' as check_name, count(*) as issue_count
from (
  select member_id
  from profiles
  where member_id is not null
  group by member_id
  having count(*) > 1
) issues

union all

select 'duplicate_member_uniform_numbers', count(*)
from (
  select member_id, uniform
  from member_numbers
  group by member_id, uniform
  having count(*) > 1
) issues

union all

select 'invalid_uniform_numbers', count(*)
from member_numbers
where number < 0 or number > 99

union all

select 'self_match_attendees_without_team', count(*)
from attendances attendance
join matches m on m.id = attendance.match_id
where m.type = 'self'
  and attendance.status = 'going'
  and attendance.team_side is null

union all

select 'self_match_guests_without_team', count(*)
from guests guest
join matches m on m.id = guest.match_id
where m.type = 'self'
  and m.status <> 'cancelled'
  and m.score_for is null
  and guest.team_side is null

union all

select 'self_match_goals_without_team', count(*)
from goals goal
join matches m on m.id = goal.match_id
where m.type = 'self'
  and goal.team_side is null

union all

select 'past_guest_names_not_anonymized', count(*)
from guests guest
join matches m on m.id = guest.match_id
where m.status = 'past'
  and m.score_for is not null
  and guest.name <> '용병'

union all

select 'partial_scores', count(*)
from matches
where (score_for is null) <> (score_against is null)

union all

select 'votes_by_non_attendees', count(*)
from mvp_votes vote
left join attendances attendance
  on attendance.match_id = vote.match_id
 and attendance.member_id = vote.voter_id
 and attendance.status = 'going'
where attendance.id is null

union all

select 'votes_for_non_attendees', count(*)
from mvp_votes vote
left join attendances attendance
  on attendance.match_id = vote.match_id
 and attendance.member_id = vote.target_id
 and attendance.status = 'going'
where attendance.id is null

order by check_name;
