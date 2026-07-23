-- MOM 투표 마감시각. 결과 입력 시점 + 1시간으로 설정됨.
-- Supabase SQL Editor에 붙여넣고 Run.

alter table matches add column if not exists mom_vote_close timestamptz;
