"use client";

import { useMemo, useState, useTransition } from "react";
import { Shuffle, UserMinus, UserPlus } from "lucide-react";
import { FORMATION_PRESETS, MatchFormation, type PoolPlayer } from "./match-formation";
import type { FormationLayout } from "@/lib/data/formations";
import type { Position } from "@/lib/positions";
import { makeBalancedTeams } from "@/lib/self-match-teams";
import {
  assignSelfMatchTeams,
  setAttendanceTeamSide,
  type SelfMatchTeamAssignment,
} from "@/lib/actions/matches";
import { setGuestTeamSide } from "@/lib/actions/guests";
import { saveFormation } from "@/lib/actions/formations";
import { toast } from "@/lib/toast";
import { Pitch } from "./pitch";

export type SelfMatchParticipant = {
  id: string;
  entityId: string;
  kind: "member" | "guest";
  name: string;
  position1: Position;
  teamSide: "red" | "sky" | null;
  redNumber: number | null;
  blueNumber: number | null;
};

export function SelfMatchFormations({
  matchId,
  participants,
  redInitial,
  skyInitial,
  isManager,
}: {
  matchId: string;
  participants: SelfMatchParticipant[];
  redInitial: FormationLayout | null;
  skyInitial: FormationLayout | null;
  isManager: boolean;
}) {
  const [assignedParticipants, setAssignedParticipants] = useState(participants);
  const [teamVersion, setTeamVersion] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [balancing, startBalance] = useTransition();
  const hasSavedLineup = [redInitial, skyInitial].some((layout) =>
    Object.values(layout ?? {}).some((quarter) => quarter.assignments.length > 0),
  );
  const [mode, setMode] = useState<"red" | "compare" | "sky">(hasSavedLineup ? "compare" : "red");
  const [redLayout, setRedLayout] = useState(redInitial);
  const [blueLayout, setBlueLayout] = useState(skyInitial);
  const redPool = useMemo(
    () => assignedParticipants
      .filter((participant) => participant.teamSide === "red")
      .map((participant) => ({ id: participant.id, name: participant.name, number: participant.redNumber })),
    [assignedParticipants],
  );
  const skyPool = useMemo(
    () => assignedParticipants
      .filter((participant) => participant.teamSide === "sky")
      .map((participant) => ({ id: participant.id, name: participant.name, number: participant.blueNumber })),
    [assignedParticipants],
  );
  const pool = mode === "red" ? redPool : skyPool;
  const initial = mode === "red" ? redLayout : blueLayout;
  const label = mode === "red" ? "레드팀" : "블루팀";

  async function persistPrunedLayouts(nextParticipants: SelfMatchParticipant[]) {
    const nextRedLayout = pruneLayout(
      redLayout,
      new Set(nextParticipants.filter((participant) => participant.teamSide === "red").map((participant) => participant.id)),
    );
    const nextBlueLayout = pruneLayout(
      blueLayout,
      new Set(nextParticipants.filter((participant) => participant.teamSide === "sky").map((participant) => participant.id)),
    );
    setRedLayout(nextRedLayout);
    setBlueLayout(nextBlueLayout);
    const results = await Promise.all([
      nextRedLayout ? saveFormation(matchId, nextRedLayout, "red") : Promise.resolve({ ok: true }),
      nextBlueLayout ? saveFormation(matchId, nextBlueLayout, "sky") : Promise.resolve({ ok: true }),
    ]);
    if (results.some((result) => !result.ok)) {
      toast("팀은 배정됐지만 기존 포메이션 정리에 실패했어요");
    }
  }

  async function changeTeam(participant: SelfMatchParticipant, teamSide: "red" | "sky" | null) {
    if (!isManager || pendingId) return;
    setPendingId(participant.id);
    const result = participant.kind === "member"
      ? await setAttendanceTeamSide(matchId, participant.entityId, teamSide)
      : await setGuestTeamSide(matchId, participant.entityId, teamSide);
    if (!result.ok) {
      toast("팀 배정을 변경하지 못했어요");
      setPendingId(null);
      return;
    }
    const nextParticipants = assignedParticipants.map((item) =>
      item.id === participant.id ? { ...item, teamSide } : item
    );
    setAssignedParticipants(nextParticipants);
    setTeamVersion((version) => version + 1);
    await persistPrunedLayouts(nextParticipants);
    setPendingId(null);
    toast(teamSide ? `${participant.name} 선수를 ${teamSide === "red" ? "레드" : "블루"}팀에 배정했어요` : `${participant.name} 선수의 팀 배정을 해제했어요`);
  }

  function balanceTeams() {
    if (!isManager || assignedParticipants.length === 0) return;
    startBalance(async () => {
      const balanced = makeBalancedTeams(assignedParticipants);
      const assignments: SelfMatchTeamAssignment[] = balanced.map((participant) => ({
        kind: participant.kind,
        id: participant.entityId,
        teamSide: participant.teamSide!,
      }));
      const result = await assignSelfMatchTeams(matchId, assignments);
      if (!result.ok) {
        toast("참석자 균형 배정에 실패했어요");
        return;
      }
      setAssignedParticipants(balanced);
      setTeamVersion((version) => version + 1);
      await persistPrunedLayouts(balanced);
      toast("참석자를 포지션별로 균형 배정했어요");
    });
  }

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

      {isManager && (
        <button
          type="button"
          onClick={balanceTeams}
          disabled={balancing || assignedParticipants.length === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-borderblue bg-card py-2.5 text-[12px] font-bold text-accent disabled:opacity-50"
        >
          <Shuffle size={14} />
          {balancing ? "균형 배정 중..." : `참석자 균형 배정 · ${assignedParticipants.length}명`}
        </button>
      )}

      {isManager && mode !== "compare" && (
        <TeamAssignmentPanel
          side={mode}
          participants={assignedParticipants}
          pendingId={pendingId}
          onChange={changeTeam}
        />
      )}

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
          key={`${mode}:${teamVersion}`}
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

function TeamAssignmentPanel({
  side,
  participants,
  pendingId,
  onChange,
}: {
  side: "red" | "sky";
  participants: SelfMatchParticipant[];
  pendingId: string | null;
  onChange: (participant: SelfMatchParticipant, side: "red" | "sky" | null) => Promise<void>;
}) {
  const team = participants.filter((participant) => participant.teamSide === side);
  const available = participants.filter((participant) => participant.teamSide === null);
  const label = side === "red" ? "레드" : "블루";
  const toneClass = side === "red" ? "text-danger" : "text-blue";
  const addClass = side === "red"
    ? "border-danger/30 bg-danger/10 text-danger"
    : "border-[#1976c9]/30 bg-[#1976c9]/10 text-blue";

  return (
    <section className="space-y-3 rounded-[14px] border border-divider bg-card p-3.5 soft-card">
      <div className="flex items-center justify-between">
        <h2 className={`text-[13px] font-bold ${toneClass}`}>{label}팀 배정</h2>
        <span className="text-[11px] text-subtle">{team.length}명</span>
      </div>

      <div className="space-y-1.5">
        {team.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            actionLabel="해제"
            disabled={pendingId !== null}
            actionClass="border-divider text-muted"
            icon={<UserMinus size={13} />}
            onClick={() => onChange(participant, null)}
          />
        ))}
        {team.length === 0 && (
          <div className="rounded-[10px] bg-sunken px-3 py-4 text-center text-[11px] text-subtle">
            배정된 참석자가 없어요.
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-semibold text-muted">미배정 참석자</div>
        <div className="space-y-1.5">
          {available.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              actionLabel={label}
              disabled={pendingId !== null}
              actionClass={addClass}
              icon={<UserPlus size={13} />}
              onClick={() => onChange(participant, side)}
            />
          ))}
          {available.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-divider px-3 py-4 text-center text-[11px] text-subtle">
              배정 가능한 참석자가 없어요.
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] leading-relaxed text-subtle">반대 팀에 배정된 선수는 이 목록에 표시되지 않아요.</p>
    </section>
  );
}

function ParticipantRow({
  participant,
  actionLabel,
  disabled,
  actionClass,
  icon,
  onClick,
}: {
  participant: SelfMatchParticipant;
  actionLabel: string;
  disabled: boolean;
  actionClass: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-divider bg-card px-2.5 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunken text-[9px] font-bold text-muted">
        {participant.position1}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-fg">{participant.name}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[10px] font-bold disabled:opacity-40 ${actionClass}`}
      >
        {icon}
        {actionLabel}
      </button>
    </div>
  );
}

function pruneLayout(layout: FormationLayout | null, allowedIds: Set<string>): FormationLayout | null {
  if (!layout) return null;
  return Object.fromEntries(
    Object.entries(layout).map(([quarter, value]) => {
      const assignments = value.assignments.filter((assignment) => allowedIds.has(assignment.memberId));
      const assignedIds = new Set(assignments.map((assignment) => assignment.memberId));
      const substitutions = (value.substitutions ?? []).filter(
        (substitution) =>
          assignedIds.has(substitution.outMemberId) &&
          allowedIds.has(substitution.inMemberId),
      );
      return [quarter, { ...value, assignments, substitutions }];
    }),
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
