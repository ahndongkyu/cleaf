"use client";

import { useState } from "react";
import { FORMATION_PRESETS, MatchFormation, type PoolPlayer } from "./match-formation";
import type { FormationLayout } from "@/lib/data/formations";
import { Pitch } from "./pitch";

export function SelfMatchFormations({
  matchId,
  redPool,
  skyPool,
  redInitial,
  skyInitial,
  isManager,
}: {
  matchId: string;
  redPool: PoolPlayer[];
  skyPool: PoolPlayer[];
  redInitial: FormationLayout | null;
  skyInitial: FormationLayout | null;
  isManager: boolean;
}) {
  const hasSavedLineup = [redInitial, skyInitial].some((layout) =>
    Object.values(layout ?? {}).some((quarter) => quarter.assignments.length > 0),
  );
  const [mode, setMode] = useState<"red" | "compare" | "sky">(hasSavedLineup ? "compare" : "red");
  const [redLayout, setRedLayout] = useState(redInitial);
  const [blueLayout, setBlueLayout] = useState(skyInitial);
  const pool = mode === "red" ? redPool : skyPool;
  const initial = mode === "red" ? redLayout : blueLayout;
  const label = mode === "red" ? "레드팀" : "블루팀";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-card p-1.5">
        <button
          type="button"
          onClick={() => setMode("red")}
          className={`rounded-lg py-2.5 text-[12px] font-bold ${mode === "red" ? "bg-[#e83d4f] text-white" : "text-muted"}`}
        >
          레드팀 · {redPool.length}명
        </button>
        <button
          type="button"
          onClick={() => setMode("compare")}
          className={`rounded-lg py-2.5 text-[12px] font-bold ${mode === "compare" ? "bg-navy text-white" : "text-muted"}`}
        >
          비교
        </button>
        <button
          type="button"
          onClick={() => setMode("sky")}
          className={`rounded-lg py-2.5 text-[12px] font-bold ${mode === "sky" ? "bg-[#1976c9] text-white" : "text-muted"}`}
        >
          블루팀 · {skyPool.length}명
        </button>
      </div>

      {mode === "compare" ? (
        <FormationComparison
          redPool={redPool}
          bluePool={skyPool}
          redLayout={redLayout}
          blueLayout={blueLayout}
          onEdit={setMode}
        />
      ) : pool.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card px-4 py-10 text-center text-[13px] text-muted">
          {label}에 배정된 참석자가 없어요.
        </div>
      ) : (
        <MatchFormation
          key={mode}
          matchId={matchId}
          opponent="자체전"
          pool={pool}
          roster={[]}
          isManager={isManager}
          initial={initial}
          teamSide={mode}
          teamLabel={label}
          onLayoutSaved={mode === "red" ? setRedLayout : setBlueLayout}
        />
      )}
    </div>
  );
}

function FormationComparison({
  redPool,
  bluePool,
  redLayout,
  blueLayout,
  onEdit,
}: {
  redPool: PoolPlayer[];
  bluePool: PoolPlayer[];
  redLayout: FormationLayout | null;
  blueLayout: FormationLayout | null;
  onEdit: (side: "red" | "sky") => void;
}) {
  const [quarter, setQuarter] = useState(1);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setQuarter(item)}
            className={`flex-1 rounded-lg py-2 text-[12px] font-bold ${quarter === item ? "bg-navy text-white" : "border border-line bg-card text-muted"}`}
          >
            {item}쿼터
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniFormation
          label="레드"
          tone="red"
          pool={redPool}
          layout={redLayout}
          quarter={quarter}
          onClick={() => onEdit("red")}
        />
        <MiniFormation
          label="블루"
          tone="blue"
          pool={bluePool}
          layout={blueLayout}
          quarter={quarter}
          onClick={() => onEdit("sky")}
        />
      </div>

      <p className="text-center text-[10.5px] text-subtle">작전판을 누르면 해당 팀을 편집할 수 있어요.</p>
    </div>
  );
}

function MiniFormation({
  label,
  tone,
  pool,
  layout,
  quarter,
  onClick,
}: {
  label: string;
  tone: "red" | "blue";
  pool: PoolPlayer[];
  layout: FormationLayout | null;
  quarter: number;
  onClick: () => void;
}) {
  const quarterLayout = layout?.[quarter];
  const preset = quarterLayout?.preset ?? "4-1-2-3";
  const slots = FORMATION_PRESETS[preset] ?? FORMATION_PRESETS["4-1-2-3"];
  const assignments = new Map((quarterLayout?.assignments ?? []).map((item) => [item.slot, item.memberId]));
  const playerById = new Map(pool.map((player) => [player.id, player]));
  const quarterCounts = new Map<string, number>();
  for (const item of Object.values(layout ?? {})) {
    const assignedIds = new Set(item.assignments.map((assignment) => assignment.memberId));
    const substitutions = (item.substitutions ?? []).filter(
      (substitution) => assignedIds.has(substitution.outMemberId) && !assignedIds.has(substitution.inMemberId),
    );
    const outIds = new Set(substitutions.map((substitution) => substitution.outMemberId));
    for (const memberId of assignedIds) {
      quarterCounts.set(memberId, (quarterCounts.get(memberId) ?? 0) + (outIds.has(memberId) ? 0.5 : 1));
    }
    for (const substitution of substitutions) {
      quarterCounts.set(substitution.inMemberId, (quarterCounts.get(substitution.inMemberId) ?? 0) + 0.5);
    }
  }
  const filled = assignments.size;
  const substitutionInIds = new Set((quarterLayout?.substitutions ?? []).map((item) => item.inMemberId));
  const unassigned = Math.max(0, pool.length - filled - substitutionInIds.size);

  return (
    <button type="button" onClick={onClick} className="min-w-0 rounded-xl border border-divider bg-card p-2 text-left soft-card">
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${tone === "red" ? "bg-[#e83d4f]" : "bg-[#1976c9]"}`}>
          {label}
        </span>
        <span className="text-[9px] text-subtle">{filled}/11 · 대기 {unassigned}</span>
      </div>
      <div className="relative overflow-hidden rounded-[10px]">
        <Pitch />
        <div className="absolute inset-0">
          {slots.map((slot, index) => {
            const memberId = assignments.get(index);
            if (!memberId) return null;
            const player = playerById.get(memberId);
            if (!player) return null;
            return (
              <div
                key={index}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full border border-white px-1 text-[7px] font-extrabold text-white shadow-sm ${tone === "red" ? "bg-[#d94150]" : "bg-[#1976c9]"}`}>
                  {player.number ?? slot.label}
                </span>
                <span className="mt-0.5 max-w-[48px] truncate rounded bg-black/45 px-1 text-[7px] font-bold leading-[12px] text-white">
                  {player.name} · {quarterCounts.get(memberId) ?? 0}Q
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {(quarterLayout?.substitutions?.length ?? 0) > 0 && (
        <div className="mt-1.5 space-y-1">
          {quarterLayout?.substitutions?.map((item) => (
            <div key={`${item.outMemberId}:${item.inMemberId}`} className="truncate rounded-md bg-sunken px-1.5 py-1 text-center text-[8px] text-muted">
              {playerById.get(item.outMemberId)?.name} → {playerById.get(item.inMemberId)?.name}
            </div>
          ))}
        </div>
      )}
      <div className="mt-1.5 text-center text-[9px] font-semibold text-muted">{preset}</div>
    </button>
  );
}
