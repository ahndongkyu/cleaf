-- 주발 정보는 더 이상 회원 데이터로 관리하지 않는다.
alter table members drop column foot;
drop type foot_code;
