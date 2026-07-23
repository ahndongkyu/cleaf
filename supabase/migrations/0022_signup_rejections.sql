-- 가입 신청 거절 상태. 신청자가 정보를 다시 제출하면 재신청 상태로 돌아간다.
alter table profiles add column if not exists signup_rejected_at timestamptz;
