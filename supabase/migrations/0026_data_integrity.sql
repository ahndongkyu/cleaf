-- 회원 저장 트랜잭션과 댓글·등번호 데이터 정합성을 강화한다.

begin;

do $$
begin
  if exists (
    select member_id, uniform
    from member_numbers
    group by member_id, uniform
    having count(*) > 1
  ) then
    raise exception '회원별 동일 유니폼 등번호 중복을 먼저 정리해야 합니다.';
  end if;

  if exists (
    select 1 from member_numbers where number < 0 or number > 99
  ) then
    raise exception '0~99 범위를 벗어난 등번호를 먼저 정리해야 합니다.';
  end if;

  if exists (
    select 1
    from matches
    where (score_for is null) <> (score_against is null)
  ) then
    raise exception '한쪽 점수만 입력된 경기를 먼저 정리해야 합니다.';
  end if;
end;
$$;

create unique index if not exists member_numbers_member_uniform_unique
  on member_numbers (member_id, uniform);

alter table member_numbers drop constraint if exists member_numbers_number_check;
alter table member_numbers add constraint member_numbers_number_check
  check (number between 0 and 99);

alter table matches drop constraint if exists matches_score_pair_check;
alter table matches add constraint matches_score_pair_check
  check ((score_for is null) = (score_against is null));

create or replace function save_member_record(
  requested_member_id uuid,
  requested_name text,
  requested_position1 text,
  requested_position2 text,
  requested_role text,
  requested_numbers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_member_id uuid;
  existing_role text;
  effective_role text;
begin
  requested_name := btrim(requested_name);
  requested_position2 := nullif(btrim(requested_position2), '');

  if requested_name is null
     or requested_name = ''
     or char_length(requested_name) > 40
     or requested_position1 is null
     or requested_position1 not in ('FW', 'MF', 'DF', 'GK')
     or requested_role is null
     or requested_role not in ('member', 'manager', 'admin')
     or (requested_position1 <> 'GK' and requested_position2 is null)
     or (requested_position1 = 'FW' and requested_position2 not in ('WF', 'CF'))
     or (requested_position1 = 'MF' and requested_position2 not in ('CAM', 'CM', 'CDM'))
     or (requested_position1 = 'DF' and requested_position2 not in ('SB', 'CB'))
     or (requested_position1 = 'GK' and requested_position2 is not null)
     or jsonb_typeof(coalesce(requested_numbers, '[]'::jsonb)) <> 'array' then
    return null;
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(requested_numbers, '[]'::jsonb)) as item(uniform text, number integer)
    where item.uniform is null
       or item.number is null
       or item.uniform not in ('빨흰', '스카이')
       or item.number not between 0 and 99
  ) or exists (
    select item.uniform
    from jsonb_to_recordset(coalesce(requested_numbers, '[]'::jsonb)) as item(uniform text, number integer)
    group by item.uniform
    having count(*) > 1
  ) then
    return null;
  end if;

  if requested_member_id is null then
    if not is_manager() then
      raise exception '운영진만 회원을 등록할 수 있습니다.';
    end if;
    effective_role := requested_role;
    insert into members (name, position1, position2, role)
    values (requested_name, requested_position1::position_code, requested_position2, effective_role::member_role)
    returning id into saved_member_id;
  else
    select role::text into existing_role
    from members
    where id = requested_member_id
    for update;

    if existing_role is null
       or (not is_manager() and requested_member_id <> current_member_id()) then
      return null;
    end if;

    effective_role := case when is_manager() then requested_role else existing_role end;
    update members
    set name = requested_name,
        position1 = requested_position1::position_code,
        position2 = requested_position2,
        role = effective_role::member_role
    where id = requested_member_id;
    saved_member_id := requested_member_id;
  end if;

  delete from member_numbers where member_id = saved_member_id;
  insert into member_numbers (member_id, uniform, number)
  select saved_member_id, item.uniform, item.number
  from jsonb_to_recordset(coalesce(requested_numbers, '[]'::jsonb)) as item(uniform text, number integer);

  return saved_member_id;
end;
$$;

revoke all on function save_member_record(uuid, text, text, text, text, jsonb) from public;
grant execute on function save_member_record(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function remove_manager_title(requested_title_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_label text;
begin
  if not is_admin() or requested_title_id is null then
    return false;
  end if;

  select label into removed_label
  from manager_titles
  where id = requested_title_id
  for update;
  if removed_label is null then
    return false;
  end if;

  update members set title = null where title = removed_label;
  delete from manager_titles where id = requested_title_id;
  return true;
end;
$$;

revoke all on function remove_manager_title(uuid) from public;
grant execute on function remove_manager_title(uuid) to authenticated;

-- 답글은 같은 경기의 최상위 댓글만 부모로 가질 수 있다.
create or replace function protect_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_match_id uuid;
  grandparent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select match_id, parent_id into parent_match_id, grandparent_id
  from comments
  where id = new.parent_id;

  if parent_match_id is null
     or parent_match_id <> new.match_id
     or grandparent_id is not null then
    raise exception '답글의 부모 댓글이 올바르지 않습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_protect_parent on comments;
create trigger comments_protect_parent
before insert or update of parent_id, match_id on comments
for each row execute function protect_comment_parent();

commit;
