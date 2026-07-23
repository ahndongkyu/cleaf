-- 가입 신청 시 받는 추가 정보 (승인 시 신규 회원 생성에 재사용)
alter table profiles add column if not exists claimed_position1 text;
alter table profiles add column if not exists claimed_position2 text;
alter table profiles add column if not exists claimed_num_red integer;   -- 빨검 등번호
alter table profiles add column if not exists claimed_num_blue integer;  -- 파랑 등번호
