// 시즌 = 연도. 시작연도부터 "현재연도"까지. 해가 바뀌면 자동으로 새 연도가 기본.
export const SEASON_START = 2026;

export function currentSeason(): number {
  return new Date().getFullYear();
}

// 현재연도부터 시작연도까지 내림차순 (셀렉트박스용)
export function seasonList(): number[] {
  const cur = currentSeason();
  const out: number[] = [];
  for (let y = cur; y >= SEASON_START; y--) out.push(y);
  return out;
}

// 유효한 시즌으로 정규화 (범위 밖이면 현재연도)
export function normalizeSeason(y: number | undefined): number {
  const cur = currentSeason();
  if (!y || y < SEASON_START || y > cur) return cur;
  return y;
}
