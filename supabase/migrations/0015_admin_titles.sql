-- 관리자(admin) 판별 함수
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select app_role() = 'admin';
$$;

-- manager_titles 쓰기 권한을 관리자 전용으로 교체
drop policy if exists manager_titles_write on manager_titles;
create policy manager_titles_write on manager_titles for all to authenticated
  using (is_admin()) with check (is_admin());
