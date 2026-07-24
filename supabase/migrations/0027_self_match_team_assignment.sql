-- 자체전 참석자·용병의 레드/블루 자동 배정을 한 트랜잭션으로 저장한다.

begin;

update attendances
set team_side = null
where status <> 'going'
  and team_side is not null;

alter table attendances drop constraint if exists attendances_team_side_status_check;
alter table attendances add constraint attendances_team_side_status_check
  check (status = 'going' or team_side is null);

create or replace function protect_attendance_managed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or is_manager() then
    if new.status <> 'going' then
      new.team_side := null;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.source := 'self';
    new.is_guest := false;
    new.team_side := null;
    return new;
  end if;

  new.match_id := old.match_id;
  new.member_id := old.member_id;
  new.source := old.source;
  new.is_guest := old.is_guest;
  new.team_side := case when new.status = 'going' then old.team_side else null end;
  return new;
end;
$$;

create or replace function assign_self_match_teams(
  requested_match_id uuid,
  requested_assignments jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_manager()
     or requested_match_id is null
     or requested_assignments is null
     or jsonb_typeof(requested_assignments) <> 'array'
     or jsonb_array_length(requested_assignments) = 0
     or jsonb_array_length(requested_assignments) > 200 then
    return false;
  end if;

  if not exists (
    select 1
    from matches
    where id = requested_match_id
      and type = 'self'
      and status <> 'cancelled'
  ) then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(requested_assignments)
      as assignment(kind text, id uuid, team_side text)
    where assignment.kind is null
       or assignment.id is null
       or assignment.team_side is null
       or assignment.kind not in ('member', 'guest')
       or assignment.team_side not in ('red', 'sky')
  ) or exists (
    select assignment.kind, assignment.id
    from jsonb_to_recordset(requested_assignments)
      as assignment(kind text, id uuid, team_side text)
    group by assignment.kind, assignment.id
    having count(*) > 1
  ) then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(requested_assignments)
      as assignment(kind text, id uuid, team_side text)
    where assignment.kind = 'member'
      and not exists (
        select 1
        from attendances attendance
        where attendance.match_id = requested_match_id
          and attendance.member_id = assignment.id
          and attendance.status = 'going'
      )
  ) or exists (
    select 1
    from jsonb_to_recordset(requested_assignments)
      as assignment(kind text, id uuid, team_side text)
    where assignment.kind = 'guest'
      and not exists (
        select 1
        from guests guest
        where guest.match_id = requested_match_id
          and guest.id = assignment.id
      )
  ) then
    return false;
  end if;

  update attendances attendance
  set team_side = assignment.team_side
  from jsonb_to_recordset(requested_assignments)
    as assignment(kind text, id uuid, team_side text)
  where assignment.kind = 'member'
    and attendance.match_id = requested_match_id
    and attendance.member_id = assignment.id
    and attendance.status = 'going';

  update guests guest
  set team_side = assignment.team_side
  from jsonb_to_recordset(requested_assignments)
    as assignment(kind text, id uuid, team_side text)
  where assignment.kind = 'guest'
    and guest.match_id = requested_match_id
    and guest.id = assignment.id;

  return true;
end;
$$;

revoke all on function assign_self_match_teams(uuid, jsonb) from public;
grant execute on function assign_self_match_teams(uuid, jsonb) to authenticated;

commit;
