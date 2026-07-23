-- 매치 장소 상세 주소 (선택) — 홈 다음경기에서 탭하면 클립보드 복사
alter table matches add column if not exists place_address text;
