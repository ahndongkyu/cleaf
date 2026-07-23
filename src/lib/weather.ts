// Open-Meteo (무료·키 불필요). 경기 시간대 핀포인트 예보.
// 좌표는 우선 서울 기본값 — 추후 matches.place_lat/lng 저장 시 그걸 사용.

export type Weather = {
  temp: number;
  feels: number;
  precip: number;
  wind: number; // m/s
  hour: number;
  code: number;
};

export async function getMatchWeather(
  dateIso: string,
  time: string | null,
  lat = 37.5665,
  lon = 126.978,
): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul&start_date=${dateIso}&end_date=${dateIso}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const hour = time ? parseInt(time.slice(0, 2), 10) : 21;
    const times: string[] = data.hourly?.time ?? [];
    if (times.length === 0) return null; // 예보 범위 밖(먼 날짜) → 날씨 없음
    const target = `${dateIso}T${String(hour).padStart(2, "0")}:00`;
    let idx = times.indexOf(target);
    if (idx < 0) {
      // 정확한 시각이 없으면 그날 중 목표 시각에 가장 가까운 시간 사용
      let best = -1, bestDiff = Infinity;
      for (let i = 0; i < times.length; i++) {
        if (!times[i].startsWith(dateIso)) continue;
        const diff = Math.abs(parseInt(times[i].slice(11, 13), 10) - hour);
        if (diff < bestDiff) { bestDiff = diff; best = i; }
      }
      idx = best;
    }
    if (idx < 0) return null;
    return {
      temp: Math.round(data.hourly.temperature_2m[idx]),
      feels: Math.round(data.hourly.apparent_temperature[idx]),
      precip: Math.round(data.hourly.precipitation_probability[idx]),
      wind: Math.round(data.hourly.wind_speed_10m[idx]),
      hour,
      code: Number(data.hourly.weather_code?.[idx] ?? 0),
    };
  } catch {
    return null;
  }
}
