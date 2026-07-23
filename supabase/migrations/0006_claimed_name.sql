-- 카카오 가입자가 입력한 본인 이름 (운영진 승인 화면에서 로스터 자동 매칭용)
alter table profiles add column if not exists claimed_name text;
