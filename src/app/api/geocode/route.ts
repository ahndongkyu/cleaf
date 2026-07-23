import { NextResponse } from "next/server";
import { isManager } from "@/lib/data/auth";

// 주소 → 좌표 (OpenStreetMap Nominatim, 무료·키 불필요) — 운영진만
export async function GET(req: Request) {
  if (!(await isManager())) return NextResponse.json({}, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({});

  // 시/구 단위 → 못 찾으면 뒤 토큰을 하나씩 떼며 더 넓은 지역으로 재시도
  const parts = q.split(/\s+/).filter(Boolean);
  try {
    for (let n = parts.length; n >= 1; n--) {
      const query = parts.slice(0, n).join(" ");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&countrycodes=kr&limit=1&accept-language=ko`,
        { headers: { "User-Agent": "CLEAR-FC/1.0 (soccer club app)" } },
      );
      if (!res.ok) continue;
      const arr = (await res.json()) as { lat?: string; lon?: string }[];
      if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
        return NextResponse.json({ lat: Number(arr[0].lat), lng: Number(arr[0].lon) });
      }
    }
    return NextResponse.json({});
  } catch {
    return NextResponse.json({});
  }
}
