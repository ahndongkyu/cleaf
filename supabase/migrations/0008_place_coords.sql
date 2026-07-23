-- 매치 장소 좌표 (카카오 장소검색에서 저장) — 날씨 정확도용
alter table matches add column if not exists place_lat double precision;
alter table matches add column if not exists place_lng double precision;
