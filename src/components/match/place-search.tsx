"use client";

import { useState } from "react";
import { MapPin, Check, Search } from "lucide-react";
import type { Venue } from "@/lib/data/venues";

// 다음(카카오) 우편번호 서비스 — 무료·키 불필요
const DAUM_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type DaumData = { roadAddress?: string; jibunAddress?: string; address?: string; buildingName?: string; sido?: string; sigungu?: string; bname?: string };
type DaumNS = { Postcode: new (opts: { oncomplete: (d: DaumData) => void }) => { open: () => void } };
function getDaum(): DaumNS | undefined {
  return (window as unknown as { daum?: DaumNS }).daum;
}
function loadDaum(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getDaum()) return resolve();
    const s = document.createElement("script");
    s.src = DAUM_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script"));
    document.head.appendChild(s);
  });
}

export function PlaceSearch({
  defaultPlace = "",
  defaultAddress = "",
  defaultLat,
  defaultLng,
  allowUnspecified = false,
  variant = "plain",
  venues = [],
  requirePlace = false,
  requireAddress = false,
  defaultUnspecified,
}: {
  defaultPlace?: string;
  defaultAddress?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
  allowUnspecified?: boolean;
  variant?: "plain" | "section";
  venues?: Venue[];
  requirePlace?: boolean;
  requireAddress?: boolean;
  defaultUnspecified?: boolean;
}) {
  const [place, setPlace] = useState(defaultPlace);
  const [address, setAddress] = useState(defaultAddress);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultLat != null && defaultLng != null ? { lat: defaultLat, lng: defaultLng } : null,
  );
  const [geo, setGeo] = useState<"idle" | "loading" | "done" | "fail">(defaultLat != null ? "done" : "idle");
  const [unspecified, setUnspecified] = useState(
    allowUnspecified && (defaultUnspecified ?? false),
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = place.trim()
    ? venues.filter((venue) => venue.name.toLocaleLowerCase("ko").includes(place.trim().toLocaleLowerCase("ko"))).slice(0, 6)
    : venues.slice(0, 6);

  function selectVenue(venue: Venue) {
    setPlace(venue.name);
    setAddress(venue.address);
    setCoords(venue.lat != null && venue.lng != null ? { lat: venue.lat, lng: venue.lng } : null);
    setGeo(venue.lat != null && venue.lng != null ? "done" : "idle");
    setShowSuggestions(false);
  }

  async function search() {
    try {
      await loadDaum();
      const daum = getDaum();
      if (!daum) return;
      new daum.Postcode({
        oncomplete: async (data) => {
          const addr = data.roadAddress || data.address || data.jibunAddress || "";
          setAddress(addr);
          if (!place && data.buildingName) setPlace(data.buildingName);
          setGeo("loading");
          setCoords(null);
          // 좌표는 행정구역(시/구/동)만으로 조회 — 도로명·번지는 무료 지도에 없는 경우가 많음.
          // 동까지 넣고, 안 잡히면 서버가 구→시로 자동 축소. 날씨엔 충분.
          const region = [data.sido, data.sigungu, data.bname].filter(Boolean).join(" ") || addr;
          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(region)}`);
            const d = await res.json();
            if (d.lat != null && d.lng != null) {
              setCoords({ lat: d.lat, lng: d.lng });
              setGeo("done");
            } else {
              setGeo("fail");
            }
          } catch {
            setGeo("fail");
          }
        },
      }).open();
    } catch {
      /* 스크립트 로드 실패 무시 */
    }
  }

  return (
    <div className={variant === "section" ? "rounded-[18px] border border-borderblue bg-card p-3.5 soft-card" : "space-y-2"}>
      <input type="hidden" name="place" value={unspecified ? "" : place} />
      <input type="hidden" name="place_address" value={unspecified ? "" : address} />
      <input type="hidden" name="place_lat" value={unspecified ? "" : coords?.lat ?? ""} />
      <input type="hidden" name="place_lng" value={unspecified ? "" : coords?.lng ?? ""} />

      {variant === "section" && (
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[15px] font-bold text-fg">장소</div>
          {allowUnspecified && (
            <button
              type="button"
              aria-pressed={unspecified}
              onClick={() => setUnspecified((value) => !value)}
              className={`rounded-[10px] border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${unspecified ? "border-accent bg-tint text-accent" : "border-borderblue bg-card text-muted"}`}
            >
              장소 미정
            </button>
          )}
        </div>
      )}

      {!unspecified && (
        <div className={variant === "section" ? "space-y-3" : "space-y-2"}>
          {variant === "section" && <label className="block text-[11.5px] font-semibold text-muted">장소명</label>}
          <div className="relative">
            <input
              value={place}
              onChange={(e) => {
                setPlace(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              required={requirePlace}
              autoComplete="off"
              role={venues.length > 0 ? "combobox" : undefined}
              aria-expanded={venues.length > 0 ? showSuggestions : undefined}
              aria-autocomplete={venues.length > 0 ? "list" : undefined}
              placeholder={variant === "section" ? "장소명을 입력하거나 등록 경기장을 선택하세요" : "장소명"}
              className="input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[12px] border border-borderblue bg-card p-1 shadow-lg">
                {suggestions.map((venue) => (
                  <button key={venue.id} type="button" role="option" aria-selected={venue.name === place && venue.address === address} onMouseDown={(event) => event.preventDefault()} onClick={() => selectVenue(venue)} className="block w-full rounded-[9px] px-3 py-2.5 text-left hover:bg-sunken">
                    <span className="block text-[13px] font-semibold text-fg">{venue.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-subtle">{venue.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {variant === "section" && <label className="block pt-0.5 text-[11.5px] font-semibold text-muted">주소</label>}
          <button
            type="button"
            onClick={search}
            className={`flex w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left text-[13px] ${variant === "section" ? "border-borderblue bg-card" : "border-line bg-card text-accent"}`}
          >
            <span className={address ? "truncate text-fg" : "text-subtle"}>{address || (variant === "section" ? "주소를 검색하세요" : "주소 찾기")}</span>
            <span className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-borderblue bg-sunken text-accent"><Search size={15} /></span>
          </button>

          {address && (
            <div className="rounded-lg bg-tint px-3 py-2 text-[12px]">
              <div className="flex items-start gap-1 text-fg">
                <MapPin size={13} className="mt-0.5 shrink-0 text-accent" /> {address}
              </div>
              <div className="mt-1 text-[11px]">
                {geo === "loading" ? (
                  <span className="text-subtle">좌표 확인 중…</span>
                ) : geo === "done" ? (
                  <span className="text-[#0f6e56]"><Check size={11} className="mr-0.5 inline align-[-1px]" />날씨 위치 설정됨</span>
                ) : geo === "fail" ? (
                  <span className="text-subtle">좌표를 못 찾았어요 (날씨는 서울 기준)</span>
                ) : null}
              </div>
            </div>
          )}
          {variant === "section" && <p className="pt-0.5 text-[11px] text-subtle">주소를 선택하면 지도 위치가 자동으로 설정돼요.</p>}
          {requireAddress && !address && <p className="text-[11px] text-danger">주소 검색 후 경기장을 등록해 주세요.</p>}
        </div>
      )}

      {unspecified && variant === "section" && <p className="text-[12px] text-subtle">장소는 추후에 입력할 수 있어요.</p>}
    </div>
  );
}
