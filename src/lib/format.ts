const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateKo(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  return { full: `${m}월 ${day}일 (${w})`, short: `${m}/${day}`, weekday: w };
}

export function dday(iso: string, today = new Date()) {
  const target = new Date(iso + "T00:00:00");
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `${-diff}일 전`;
}


// 주소 → 지역 라벨 (도·도로명·번지 제외, 시/군/구/동 단위까지). 예: "경기 안산시 상록구 시낭로 45" → "안산시 상록구"
const SIDO = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
  "경기도", "강원도", "강원특별자치도", "충청북도", "충청남도", "전라북도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
];

export function regionLabel(address: string | null | undefined): string | null {
  if (!address) return null;
  const toks = address.trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return null;
  let i = SIDO.includes(toks[0]) ? 1 : 0;
  const out: string[] = [];
  for (; i < toks.length; i++) {
    const t = toks[i];
    if (/[시군구]$/.test(t)) out.push(t);
    else if (/[읍면동]$/.test(t)) { out.push(t); break; }
    else break; // 도로명(로/길)·번지 → 중단
  }
  return out.length ? out.join(" ") : null;
}
