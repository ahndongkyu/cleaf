-- 런칭 전 테스트 데이터 정리 (관리자 로그인은 유지)
-- Supabase SQL Editor에서 실행. 프로필(auth)·관리자 회원·푸시 구독은 보존됩니다.
begin;

-- 1) 매치 스코프 데이터 전부 삭제 (attendances/goals/formations/mvp_votes/guests 는 matches FK로 함께 정리되지만 명시)
truncate goals, mvp_votes, formations, attendances, guests, matches restart identity cascade;

-- 2) 공지사항 삭제
truncate notices restart identity cascade;

-- 3) 프로필에 연결된 회원(=관리자 본인) 외 모든 회원 삭제
delete from member_numbers
  where member_id not in (select member_id from profiles where member_id is not null);
delete from members
  where id not in (select member_id from profiles where member_id is not null);

commit;

-- 확인용 (실행 후 남은 데이터)
-- select count(*) as members from members;
-- select count(*) as matches from matches;
-- select id, name, role from members;
