"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Pencil, ArrowLeft } from "lucide-react";
import { POSITION_BADGE } from "@/lib/mock";
import type { MemberRow } from "@/lib/data/members";

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const MERGE: Record<string, string> = { "ㄲ": "ㄱ", "ㄸ": "ㄷ", "ㅃ": "ㅂ", "ㅆ": "ㅅ", "ㅉ": "ㅈ" };
const INDEX = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

function chosung(name: string): string {
  const c = name.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) {
    const ch = CHO[Math.floor((c - 0xac00) / 588)];
    return MERGE[ch] ?? ch;
  }
  return "#";
}

export function MemberIndexList({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const query = q.trim();
    const filtered = members
      .filter((m) => m.name.includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    const map = new Map<string, MemberRow[]>();
    for (const m of filtered) {
      const c = chosung(m.name);
      (map.get(c) ?? map.set(c, []).get(c)!).push(m);
    }
    // INDEX 순서대로 정렬 (# 은 맨 뒤)
    return [...map.entries()].sort((a, b) => {
      const ia = INDEX.indexOf(a[0]);
      const ib = INDEX.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [members, q]);

  const present = new Set(groups.map((g) => g[0]));

  function scrubTo(clientY: number) {
    const idx = idxRef.current;
    const list = listRef.current;
    if (!idx || !list) return;
    const rect = idx.getBoundingClientRect();
    const i = Math.floor(((clientY - rect.top) / rect.height) * INDEX.length);
    const k = INDEX[Math.max(0, Math.min(INDEX.length - 1, i))];
    const el = list.querySelector<HTMLElement>(`[data-cho="${k}"]`);
    if (el) list.scrollTo({ top: el.offsetTop });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-[15px] font-medium">회원 관리 <span className="text-[13px] text-subtle">{members.length}명</span></h1>
        </Link>
        <Link href="/admin/members/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
          <UserPlus size={14} /> 회원 등록
        </Link>
      </div>

      <div className="mb-2.5 flex items-center gap-2 rounded-[10px] border border-line bg-card px-3 py-2.5">
        <Search size={15} className="text-subtle" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 검색" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
      </div>

      <div className="relative">
        <div ref={listRef} className="no-scrollbar relative max-h-[calc(100dvh-190px)] overflow-y-auto rounded-xl border border-line bg-card pr-4 soft-card">
          {groups.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-subtle">검색 결과가 없어요.</div>
          ) : (
            groups.map(([c, list]) => (
              <div key={c}>
                <div data-cho={c} className="sticky top-0 z-[1] border-b border-divider bg-sunken px-3.5 py-1 text-[11px] font-bold text-subtle">{c}</div>
                {list.map((m) => {
                  const badge = POSITION_BADGE[m.position1];
                  return (
                    <Link key={m.id} href={`/members/${m.id}/edit`} className="flex items-center gap-2.5 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                      <span className="shrink-0 rounded-[8px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{m.position1}</span>
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-medium">
                        <span className="truncate">{m.name}</span>
                        {m.role === "manager" && <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">{m.title ?? "운영진"}</span>}
                      </div>
                      <Pencil size={14} className="shrink-0 text-faint" />
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 초성 인덱스 (은은 · 있는 자음만 그림자 · 드래그 스크럽) */}
        <div
          ref={idxRef}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); scrubTo(e.clientY); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubTo(e.clientY); }}
          className="absolute inset-y-1 right-0.5 flex touch-none select-none flex-col justify-center"
        >
          {INDEX.map((k) => {
            const has = present.has(k);
            return (
              <span
                key={k}
                data-k={k}
                className="px-1 text-center text-[9.5px] font-semibold leading-[1.4]"
                style={has ? { color: "#9aa3b1", textShadow: "0 1px 1.5px rgba(20,33,61,.28)" } : { color: "var(--clearfc-faint, #d3d8e0)" }}
              >
                {k}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
