-- 종료된 경기의 용병 실명을 익명화한다.
update guests as g
set name = '용병'
from matches as m
where g.match_id = m.id
  and (m.status = 'past' or m.score_for is not null)
  and g.name <> '용병';
