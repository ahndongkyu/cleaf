"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { POSITION_COLOR } from "@/lib/mock";
import type { MemberStat } from "@/lib/data/stats";

const TABS: { label: string; unit: string; get: (s: MemberStat) => number }[] = [
  { label: "득점왕", unit: "골", get: (s) => s.goals },
  { label: "도움왕", unit: "도움", get: (s) => s.assists },
  { label: "공격P", unit: "P", get: (s) => s.attackPoints },
  { label: "출석왕", unit: "경기", get: (s) => s.games },
  { label: "MOM", unit: "회", get: (s) => s.mvp },
];

// 원 안 표시: 상세포지션 있으면 그걸(WF·CM…), 없으면 일반 포지션(FW/MF…)
const posText = (s: MemberStat) => s.position2 || s.position1;
const subText = (s: MemberStat, isAttend: boolean) => (isAttend ? `출석률 ${s.attendRate}%` : `${s.games}경기`);

export function RankingList({ stats }: { stats: MemberStat[] }) {
  const [tab, setTab] = useState(0);
  const t = TABS[tab];
  const isAttend = t.label === "출석왕";
  const ranked = [...stats].filter((s) => t.get(s) > 0).sort((a, b) => t.get(b) - t.get(a));
  const first = ranked[0];
  const second = ranked[1];
  const third = ranked[2];
  const rest = ranked.slice(3);
  const listMax = rest.length ? t.get(rest[0]) : 1;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb, i) => (
          <button
            key={tb.label}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-[20px] px-3.5 py-1.5 text-xs font-medium ${i === tab ? "bg-accent text-white" : "border border-divider bg-card text-muted"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">아직 {t.label} 기록이 없어요.</div>
      ) : (
        <>
          {/* 1등 히어로 */}
          {first && (
            <div className="soft-card-lg relative flex items-center gap-3 overflow-hidden rounded-2xl bg-navy p-4 text-white">
              <Disc s={first} size={54} font={15} rank={1} borderClass="border-navy" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[16px] font-extrabold">
                  <Crown size={14} className="shrink-0 text-[#f5c451]" /> <span className="truncate">{first.name}</span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-navy-muted">{first.games}경기 · {first.goals}골 · {first.assists}도움</div>
              </div>
              <div className="shrink-0 text-right text-[30px] font-extrabold leading-none tabular-nums">
                {t.get(first)}<span className="ml-0.5 text-[12px] font-semibold text-navy-muted">{t.unit}</span>
              </div>
            </div>
          )}

          {/* 2·3등 */}
          {(second || third) && (
            <div className="flex gap-2">
              {[second, third].map((s, i) =>
                s ? (
                  <div key={s.id} className="soft-card flex flex-1 items-center gap-2.5 rounded-xl border border-divider bg-card p-2.5">
                    <Disc s={s} size={38} font={12} rank={i + 2} borderClass="border-card" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-bold leading-tight">{s.name}</div>
                      <div className="mt-0.5 text-[10px] text-subtle">{subText(s, isAttend)}</div>
                    </div>
                    <div className="shrink-0 text-[15px] font-extrabold tabular-nums">
                      {t.get(s)}<span className="text-[10px] font-semibold text-subtle">{t.unit}</span>
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex-1" />
                ),
              )}
            </div>
          )}

          {/* 4등~ */}
          {rest.length > 0 && (
            <div>
              <div className="mb-2 mt-1 flex items-center justify-between px-0.5">
                <span className="text-[12px] font-bold text-muted">전체 랭킹</span>
                <span className="text-[11px] text-subtle">{ranked.length}명</span>
              </div>
              <div className="space-y-1.5">
                {rest.map((s, i) => {
                  const c = POSITION_COLOR[s.position1];
                  return (
                    <div key={s.id} className="relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-divider bg-card px-3 py-2">
                      <span className="absolute inset-y-0 left-0 rounded-xl" style={{ width: `${(t.get(s) / listMax) * 100}%`, background: c, opacity: 0.1 }} aria-hidden />
                      <span className="relative w-4 shrink-0 text-center text-[12px] font-extrabold text-subtle tabular-nums">{i + 4}</span>
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold tracking-tight text-white" style={{ background: c }}>{posText(s)}</span>
                      <div className="relative min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{s.name}</div>
                        <div className="text-[10px] text-subtle">{subText(s, isAttend)}</div>
                      </div>
                      <span className="relative shrink-0 text-[14px] font-extrabold tabular-nums">
                        {t.get(s)}<span className="text-[10px] font-semibold text-subtle">{t.unit}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 상세포지션 원 + 순위 메달 배지
function Disc({ s, size, font, rank, borderClass }: { s: MemberStat; size: number; font: number; rank: number; borderClass: string }) {
  const c = POSITION_COLOR[s.position1];
  const medal = rank === 1 ? { bg: "#f5c451", fg: "#3a1c00" } : rank === 2 ? { bg: "#c7ccd6", fg: "#3a3f47" } : { bg: "#dda574", fg: "#3a1c00" };
  const badge = size >= 50 ? 19 : 16;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight text-white"
      style={{ width: size, height: size, fontSize: font, background: c }}
    >
      {posText(s)}
      <span
        className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 font-extrabold ${borderClass}`}
        style={{ width: badge, height: badge, fontSize: badge >= 19 ? 10 : 9, background: medal.bg, color: medal.fg }}
      >
        {rank}
      </span>
    </div>
  );
}
