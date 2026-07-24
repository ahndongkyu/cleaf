"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { setAttendanceFor } from "@/lib/actions/matches";
import { type Position } from "@/lib/positions";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/lib/toast";

type St = "going" | "notGoing" | "undecided";
type Member = { id: string; name: string; position1: Position };

const PILLS: { v: St; label: string; bg: string }[] = [
  { v: "going", label: "참", bg: "#1d9e75" },
  { v: "notGoing", label: "불", bg: "#dc2f3c" },
  { v: "undecided", label: "미", bg: "#888780" },
];

export function AttendanceManager({
  matchId,
  members,
  initial,
}: {
  matchId: string;
  members: Member[];
  initial: Record<string, { status: St; source: "self" | "manager"; teamSide: "red" | "sky" | null }>;
}) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, St>>(() => {
    const s: Record<string, St> = {};
    for (const m of members) s[m.id] = initial[m.id]?.status ?? "undecided";
    return s;
  });
  const [, start] = useTransition();

  const counts = useMemo(() => {
    const c = { going: 0, notGoing: 0, undecided: 0 };
    for (const m of members) c[statuses[m.id]]++;
    return c;
  }, [statuses, members]);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const filteredMembers = normalizedQuery
    ? members.filter((member) => member.name.toLocaleLowerCase("ko").includes(normalizedQuery))
    : members;

  function set(id: string, s: St) {
    const previousStatus = statuses[id];
    setStatuses((prev) => ({ ...prev, [id]: s }));
    start(async () => {
      const result = await setAttendanceFor(matchId, id, s);
      if (!result.ok) {
        setStatuses((prev) => ({ ...prev, [id]: previousStatus }));
        toast("참석 상태를 변경하지 못했어요");
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* 요약 */}
      <div className="flex justify-around rounded-xl bg-navy px-3 py-3 text-white">
        <Sum v={counts.going} l="참석" c="#9fe1cb" />
        <Sum v={counts.notGoing} l="불참" c="#f6c9d8" />
        <Sum v={counts.undecided} l="미정" c="#fff" />
      </div>

      <div className="text-[11px] leading-relaxed text-subtle">
        본인이 체크 안 한 회원은 여기서 대리로 눌러주세요.
      </div>

      <label className="flex items-center gap-2 rounded-[11px] border border-divider bg-card px-3 py-2.5">
        <Search size={15} className="shrink-0 text-subtle" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="회원 이름 검색"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-subtle"
        />
      </label>

      {/* 명단 */}
      <div className="space-y-2">
        {filteredMembers.map((m) => {
          const src = initial[m.id]?.source;
          const cur = statuses[m.id];
          return (
            <div key={m.id} className="flex items-center gap-2.5 rounded-[10px] border border-divider bg-card px-2.5 py-2">
              <Avatar size={32} />
              <div className="flex-1">
                <div className="text-[13px]">{m.name}</div>
                <div className="text-[10px] text-subtle">
                  {src === "self" ? "본인" : src === "manager" ? "운영진 대리" : "미체크"}
                </div>
              </div>
              <div className="flex gap-1">
                {PILLS.map((p) => {
                  const active = cur === p.v;
                  return (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => set(m.id, p.v)}
                      aria-label={`${m.name} ${p.v === "going" ? "참석" : p.v === "notGoing" ? "불참" : "미정"}`}
                      className="h-7 w-7 rounded-md text-[12px] font-medium"
                      style={active ? { background: p.bg, color: "#fff" } : { background: "var(--color-surface-1)", color: "#999" }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-divider px-4 py-8 text-center text-[12px] text-subtle">
            검색 결과가 없어요.
          </div>
        )}
      </div>
    </div>
  );
}

function Sum({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-medium" style={{ color: c }}>{v}</div>
      <div className="mt-0.5 text-[11px] text-navy-muted">{l}</div>
    </div>
  );
}
