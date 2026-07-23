-- 상세 포지션(WF/CF/CAM/CM/CDM/SB/CB)을 position2에 저장할 수 있게 enum → text 전환
alter table members alter column position2 type text using position2::text;
