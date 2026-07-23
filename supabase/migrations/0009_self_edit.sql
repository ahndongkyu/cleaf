-- 회원 본인이 자기 프로필 수정 허용 (권한 변경은 운영진만 — 권한 상승 방지)

-- 본인(=연결된 member)만 members 행 UPDATE 허용 (기존 members_write=운영진 정책과 OR)
create policy members_update_self on members for update to authenticated
  using (id = current_member_id())
  with check (id = current_member_id());

-- 비운영진이 role/status를 바꾸려 해도 원래 값으로 강제 (UI 우회 방지)
create or replace function protect_member_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists members_protect_role on members;
create trigger members_protect_role before update on members
  for each row execute function protect_member_role();

-- 본인 등번호 관리 허용 (기존 member_numbers_write=운영진 정책과 OR)
create policy member_numbers_self on member_numbers for all to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());
