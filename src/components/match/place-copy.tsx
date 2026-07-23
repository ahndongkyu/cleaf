"use client";

import { MapPin, Copy } from "lucide-react";
import { toast } from "@/lib/toast";

// 장소 탭 → 주소 클립보드 복사 (홈 다음경기)
export function PlaceCopy({ place, address }: { place: string; address: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      toast("주소가 복사됐어요");
    } catch {
      toast("복사에 실패했어요");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sunken px-2.5 py-1 text-[12px] text-muted"
    >
      <MapPin size={13} className="text-accent" /> {place}
      <Copy size={12} className="ml-0.5 text-subtle" />
    </button>
  );
}
