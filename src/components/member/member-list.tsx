"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { POSITION_BADGE, POSITION_LABEL, DETAIL_POSITION_LABEL, type Position } from "@/lib/mock";
import type { MemberRow } from "@/lib/data/members";
import { Avatar } from "@/components/ui/avatar";

const ORDER: Position[] = ["FW", "MF", "DF", "GK"];

export function MemberList({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(kw) ||
        m.position1.toLowerCase().includes(kw) ||
        POSITION_LABEL[m.position1].includes(kw),
    );
  }, [members, q]);

  const grouped = ORDER.map((pos) => ({ pos, list: filtered.filter((m) => m.position1 === pos) })).filter((g) => g.list.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-[10px] border border-divider bg-card px-3 py-2.5">
        <Search size={16} className="text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·포지션 검색"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-subtle"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">검색 결과가 없어요.</div>
      ) : (
        grouped.map(({ pos, list }) => {
          const badge = POSITION_BADGE[pos];
          return (
            <div key={pos}>
              <div className="mb-2 ml-1 text-xs text-subtle">{POSITION_LABEL[pos]} ({pos}) {list.length}</div>
              <div className="overflow-hidden rounded-xl border border-divider bg-card soft-card">
                {list.map((m, i) => (
                  <Link key={m.id} href={`/members/${m.id}`} className={`flex items-center gap-3 px-3.5 py-3 ${i < list.length - 1 ? "border-b border-divider" : ""}`}>
                    <Avatar size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="truncate">{m.name}</span>
                        {m.role === "manager" && <span className="shrink-0 rounded-lg bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">운영진</span>}
                      </div>
                      <div className="text-[11px] text-subtle">
                        {m.position2 ? `${m.position2} · ${DETAIL_POSITION_LABEL[m.position2] ?? ""}`.replace(/ · $/, "") : "상세 포지션 미설정"}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-[10px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{m.position1}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
