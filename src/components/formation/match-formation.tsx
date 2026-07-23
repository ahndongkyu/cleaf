"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, UserMinus, RotateCcw, Check, Share2, ChevronDown, Search, ArrowRight, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { POSITION_COLOR, type Position } from "@/lib/positions";
import { saveFormation } from "@/lib/actions/formations";
import { setAttendanceFor } from "@/lib/actions/matches";
import type { FormationLayout, FormationTeamSide } from "@/lib/data/formations";
import { toast } from "@/lib/toast";
import { Pitch } from "./pitch";

export type PoolPlayer = { id: string; name: string; number: number | null };
type Slot = { x: number; y: number; label: string };

// 포메이션별 자리값 고정 (세로 피치, 위쪽=공격). 표시 순서 = 이 순서.
export const FORMATION_PRESETS: Record<string, Slot[]> = {
  "4-1-2-3": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 72, label: "LB" }, { x: 40, y: 75, label: "CB" }, { x: 60, y: 75, label: "CB" }, { x: 82, y: 72, label: "RB" },
    { x: 50, y: 58, label: "CDM" },
    { x: 34, y: 44, label: "CM" }, { x: 66, y: 44, label: "CM" },
    { x: 22, y: 22, label: "LW" }, { x: 50, y: 16, label: "ST" }, { x: 78, y: 22, label: "RW" },
  ],
  "4-2-3-1": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 74, label: "LB" }, { x: 40, y: 76, label: "CB" }, { x: 60, y: 76, label: "CB" }, { x: 82, y: 74, label: "RB" },
    { x: 36, y: 58, label: "CDM" }, { x: 64, y: 58, label: "CDM" },
    { x: 22, y: 38, label: "LM" }, { x: 50, y: 36, label: "AM" }, { x: 78, y: 38, label: "RM" },
    { x: 50, y: 18, label: "ST" },
  ],
  "4-3-3": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 72, label: "LB" }, { x: 40, y: 75, label: "CB" }, { x: 60, y: 75, label: "CB" }, { x: 82, y: 72, label: "RB" },
    { x: 28, y: 50, label: "CM" }, { x: 50, y: 46, label: "CDM" }, { x: 72, y: 50, label: "CM" },
    { x: 22, y: 24, label: "LW" }, { x: 50, y: 18, label: "ST" }, { x: 78, y: 24, label: "RW" },
  ],
  "4-4-2": [
    { x: 50, y: 90, label: "GK" },
    { x: 16, y: 72, label: "LB" }, { x: 38, y: 74, label: "CB" }, { x: 62, y: 74, label: "CB" }, { x: 84, y: 72, label: "RB" },
    { x: 16, y: 48, label: "LM" }, { x: 38, y: 50, label: "CM" }, { x: 62, y: 50, label: "CM" }, { x: 84, y: 48, label: "RM" },
    { x: 38, y: 22, label: "ST" }, { x: 62, y: 22, label: "ST" },
  ],
  "3-5-2": [
    { x: 50, y: 90, label: "GK" },
    { x: 30, y: 74, label: "CB" }, { x: 50, y: 76, label: "CB" }, { x: 70, y: 74, label: "CB" },
    { x: 14, y: 54, label: "LM" }, { x: 34, y: 52, label: "CM" }, { x: 50, y: 50, label: "CDM" }, { x: 66, y: 52, label: "CM" }, { x: 86, y: 54, label: "RM" },
    { x: 38, y: 22, label: "ST" }, { x: 62, y: 22, label: "ST" },
  ],
};
const PRESETS = FORMATION_PRESETS;

const GROUP: Record<string, Position> = {
  GK: "GK",
  LB: "DF", RB: "DF", CB: "DF", LWB: "DF", RWB: "DF",
  CDM: "MF", CM: "MF", LM: "MF", RM: "MF", AM: "MF",
  LW: "FW", RW: "FW", ST: "FW", CF: "FW",
};
const groupOf = (label: string): Position => GROUP[label] ?? "MF";
const QUARTERS = [1, 2, 3, 4];
const TOTAL_SLOTS = 11 * 4; // 필드 11명 × 4쿼터

// 총 출전 쿼터 수 배지 색 (권장 범위 기준 상대 색)
function quarterBadgeColor(c: number, recLo: number, recHi: number): string {
  if (c >= recHi) return "#16b585"; // 충분
  if (c >= recLo) return "#2f9e8b"; // 권장 하한
  if (c === 0) return "#c2cad6"; // 미배치
  if (c >= recLo - 1) return "#e8912b"; // 약간 적음
  return "#dc2f3c"; // 매우 적음
}

type Assign = Record<number, string>; // slotIndex → memberId
type Substitution = { slot: number; outMemberId: string; inMemberId: string };

export function MatchFormation({
  matchId, opponent, pool, roster, isManager, initial, teamSide = "all", teamLabel, onLayoutSaved,
}: {
  matchId: string;
  opponent: string;
  pool: PoolPlayer[];
  roster: PoolPlayer[];
  isManager: boolean;
  initial: FormationLayout | null;
  teamSide?: FormationTeamSide;
  teamLabel?: string;
  onLayoutSaved?: (layout: FormationLayout) => void;
}) {
  const lineupTitle = teamLabel ?? `vs ${opponent}`;
  const router = useRouter();
  const [quarter, setQuarter] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initial != null);
  const [dirty, setDirty] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [benchSort, setBenchSort] = useState<"name" | "low">("name");
  const [manageTab, setManageTab] = useState<"add" | "del">("add");
  const [manageQ, setManageQ] = useState("");
  const [manageSel, setManageSel] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [captureQs, setCaptureQs] = useState<number[] | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const [pendingPlayer, setPendingPlayer] = useState<string | null>(null);
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [subOut, setSubOut] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const autoSaveReadyRef = useRef(false);
  const autoSaveVersionRef = useRef(0);
  // 실제로 편집했거나 의도적으로 비운 쿼터만 자동 복사 대상에서 제외한다.
  // 이전 저장본에는 initialized가 없으므로, 선수가 배치된 쿼터만 작성된 것으로 본다.
  const initializedQuartersRef = useRef<Set<number>>(
    new Set(QUARTERS.filter((q) => {
      const savedQuarter = initial?.[q];
      return savedQuarter?.initialized === true || (savedQuarter?.assignments.length ?? 0) > 0;
    })),
  );
  const [, startAdd] = useTransition();
  const [presetByQ, setPresetByQ] = useState<Record<number, string>>(() => {
    const s: Record<number, string> = {};
    for (const q of QUARTERS) s[q] = initial?.[q]?.preset ?? "4-1-2-3";
    return s;
  });
  const [assignByQ, setAssignByQ] = useState<Record<number, Assign>>(() => {
    const s: Record<number, Assign> = {};
    for (const q of QUARTERS) {
      const a: Assign = {};
      for (const x of initial?.[q]?.assignments ?? []) {
        if (pool.some((p) => p.id === x.memberId)) a[x.slot] = x.memberId;
      }
      s[q] = a;
    }
    return s;
  });
  const [subByQ, setSubByQ] = useState<Record<number, Substitution[]>>(() => {
    const s: Record<number, Substitution[]> = {};
    for (const q of QUARTERS) {
      s[q] = (initial?.[q]?.substitutions ?? []).filter(
        (item) => pool.some((p) => p.id === item.outMemberId) && pool.some((p) => p.id === item.inMemberId),
      );
    }
    return s;
  });

  const preset = presetByQ[quarter];
  const slots = PRESETS[preset];
  const assign = assignByQ[quarter];
  const assignedIds = new Set(Object.values(assign));
  const bench = pool.filter((p) => !assignedIds.has(p.id));
  const filled = Object.keys(assign).length;
  const nameById = new Map(pool.map((p) => [p.id, p]));

  function validSubstitutions(q: number, substitutions = subByQ[q]): Substitution[] {
    const quarterAssign = assignByQ[q];
    const assigned = new Set(Object.values(quarterAssign));
    const poolIds = new Set(pool.map((player) => player.id));
    return substitutions.filter(
      (item) =>
        quarterAssign[item.slot] === item.outMemberId &&
        assigned.has(item.outMemberId) &&
        !assigned.has(item.inMemberId) &&
        poolIds.has(item.inMemberId),
    );
  }

  const currentSubstitutions = validSubstitutions(quarter);
  const usedSubOutIds = new Set(currentSubstitutions.map((item) => item.outMemberId));
  const usedSubInIds = new Set(currentSubstitutions.map((item) => item.inMemberId));

  // 선수별 총 출전 쿼터 수. 교체된 OUT·IN 선수는 해당 쿼터를 각각 0.5Q로 계산한다.
  const quarterCountById = new Map<string, number>();
  for (const q of QUARTERS) {
    const substitutions = validSubstitutions(q);
    const outIds = new Set(substitutions.map((item) => item.outMemberId));
    for (const id of new Set(Object.values(assignByQ[q]))) {
      quarterCountById.set(id, (quarterCountById.get(id) ?? 0) + (outIds.has(id) ? 0.5 : 1));
    }
    for (const item of substitutions) {
      quarterCountById.set(item.inMemberId, (quarterCountById.get(item.inMemberId) ?? 0) + 0.5);
    }
  }
  const qCount = (id: string) => quarterCountById.get(id) ?? 0;
  const rec = pool.length ? TOTAL_SLOTS / pool.length : 0;
  const recLo = Math.floor(rec);
  const recHi = Math.ceil(rec);
  const avgQ = pool.length ? [...quarterCountById.values()].reduce((a, b) => a + b, 0) / pool.length : 0;
  const sortedBench =
    benchSort === "low"
      ? [...bench].sort((a, b) => qCount(a.id) - qCount(b.id) || a.name.localeCompare(b.name, "ko"))
      : [...bench].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  function markQuarterInitialized(q = quarter) {
    initializedQuartersRef.current.add(q);
  }

  function selectQuarter(nextQuarter: number) {
    if (
      isManager &&
      nextQuarter > 1 &&
      !initializedQuartersRef.current.has(nextQuarter) &&
      Object.keys(assignByQ[nextQuarter - 1]).length > 0
    ) {
      const previousQuarter = nextQuarter - 1;
      const copiedAssignments = { ...assignByQ[previousQuarter] };
      const copiedPreset = presetByQ[previousQuarter];
      initializedQuartersRef.current.add(nextQuarter);
      setPresetByQ((current) => ({ ...current, [nextQuarter]: copiedPreset }));
      setAssignByQ((current) => ({ ...current, [nextQuarter]: copiedAssignments }));
      toast(`${previousQuarter}쿼터 포메이션을 불러왔어요`);
    }
    setQuarter(nextQuarter);
    setSelected(null);
    setPendingPlayer(null);
    setSubstitutionMode(false);
    setSubOut("");
  }

  function onSlotClick(i: number) {
    if (!isManager) return; // 회원은 보기 전용
    if (substitutionMode) {
      const memberId = assign[i];
      if (!memberId || usedSubOutIds.has(memberId)) return;
      setSubOut(memberId);
      window.setTimeout(() => benchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    // 선수를 먼저 고른 상태 → 그 자리에 배치 (기존 선수는 밀려나 벤치로)
    if (pendingPlayer) {
      markQuarterInitialized();
      setAssignByQ((s) => ({ ...s, [quarter]: { ...s[quarter], [i]: pendingPlayer } }));
      setPendingPlayer(null);
      setSelected(null);
      return;
    }
    if (assign[i]) {
      // 채워진 자리 탭 → 비우기
      markQuarterInitialized();
      setAssignByQ((s) => {
        const a = { ...s[quarter] };
        delete a[i];
        return { ...s, [quarter]: a };
      });
      setSelected(null);
    } else {
      const willSelect = selected !== i;
      setSelected(willSelect ? i : null);
      if (willSelect) {
        window.setTimeout(() => benchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      }
    }
  }

  function fillFromBench(memberId: string) {
    if (!isManager) return; // 회원은 보기 전용
    if (substitutionMode) {
      if (!subOut || usedSubInIds.has(memberId) || assignedIds.has(memberId)) return;
      const slot = Object.entries(assign).find(([, assignedMemberId]) => assignedMemberId === subOut)?.[0];
      if (slot == null) return;
      markQuarterInitialized();
      setSubByQ((current) => ({
        ...current,
        [quarter]: [
          ...validSubstitutions(quarter, current[quarter]),
          { slot: Number(slot), outMemberId: subOut, inMemberId: memberId },
        ],
      }));
      setSubstitutionMode(false);
      setSubOut("");
      toast("교체를 등록했어요");
      window.setTimeout(() => pitchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    window.setTimeout(() => pitchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    // 자리를 먼저 고른 상태 → 그 자리에 배치
    if (selected !== null && !assign[selected]) {
      const slot = selected;
      markQuarterInitialized();
      setAssignByQ((s) => ({ ...s, [quarter]: { ...s[quarter], [slot]: memberId } }));
      setSelected(null);
      setPendingPlayer(null);
      return;
    }
    // 아니면 이 선수를 '배치 대기'로 (다시 탭하면 해제) → 이후 빈 자리 탭
    setPendingPlayer((cur) => (cur === memberId ? null : memberId));
    setSelected(null);
  }

  // 배치된 선수 위치 교환/이동 (드래그앤드롭)
  function moveSlot(from: number, to: number) {
    if (from === to) return;
    markQuarterInitialized();
    setAssignByQ((s) => {
      const a = { ...s[quarter] };
      const fromPid = a[from];
      if (!fromPid) return s;
      const toPid = a[to];
      if (toPid) { a[from] = toPid; a[to] = fromPid; } // 서로 교환
      else { a[to] = fromPid; delete a[from]; } // 빈 자리로 이동
      return { ...s, [quarter]: a };
    });
  }

  function slotPointerDown(e: React.PointerEvent, i: number) {
    if (!isManager) return; // 회원은 드래그 불가
    if (substitutionMode) return;
    if (!assign[i]) return; // 배치된 선수만 드래그
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragFrom(i);
  }
  function slotPointerMove(e: React.PointerEvent) {
    if (dragFrom === null || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragStartRef.current.moved && Math.hypot(dx, dy) < 6) return;
    dragStartRef.current.moved = true;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (rect) setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function slotPointerUp(e: React.PointerEvent) {
    if (dragFrom === null) return;
    const moved = dragStartRef.current?.moved;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (moved && rect) {
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      let best = -1, bestD = Infinity;
      slots.forEach((sl, idx) => { const d = Math.hypot(sl.x - px, sl.y - py); if (d < bestD) { bestD = d; best = idx; } });
      if (best >= 0 && bestD < 16 && best !== dragFrom) moveSlot(dragFrom, best);
      suppressClickRef.current = true; // 드래그 뒤 따라오는 click(비우기) 무시
    }
    setDragFrom(null);
    setDragPos(null);
    dragStartRef.current = null;
  }
  function slotClick(i: number) {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    onSlotClick(i);
  }

  function applyPreset(name: string) {
    markQuarterInitialized();
    setPresetByQ((s) => ({ ...s, [quarter]: name }));
    setSelected(null);
  }

  function toggleManageSel(id: string) {
    setManageSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchManageTab(t: "add" | "del") {
    setManageTab(t);
    setManageSel(new Set());
    setManageQ("");
  }

  // 선택한 회원 일괄 처리: 추가=대리 참석(going), 제거=미정(undecided)로 되돌림
  function applyManage() {
    if (manageSel.size === 0) return;
    const ids = [...manageSel];
    const status = manageTab === "add" ? "going" : "undecided";
    startAdd(async () => {
      for (const id of ids) await setAttendanceFor(matchId, id, status);
      toast(manageTab === "add" ? `${ids.length}명 참석 추가됐어요` : `${ids.length}명 명단에서 제거됐어요`);
      setManageSel(new Set());
      setShowRoster(false);
      router.refresh();
    });
  }

  function buildLayout(): FormationLayout {
    const layout: FormationLayout = {};
    for (const q of QUARTERS) {
      layout[q] = {
        preset: presetByQ[q],
        assignments: Object.entries(assignByQ[q]).map(([slot, memberId]) => ({ slot: Number(slot), memberId })),
        substitutions: validSubstitutions(q),
        initialized: initializedQuartersRef.current.has(q),
      };
    }
    return layout;
  }

  useEffect(() => {
    if (!isManager) return;
    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      return;
    }

    const version = ++autoSaveVersionRef.current;
    setSaved(false);
    setDirty(true);
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const layout = buildLayout();
      try {
        const result = await saveFormation(matchId, layout, teamSide);
        if (version !== autoSaveVersionRef.current) return;
        if (!result.ok) {
          toast("자동 저장하지 못했어요. 다시 변경해 주세요");
          return;
        }
        setSaved(true);
        setDirty(false);
        onLayoutSaved?.(layout);
      } catch {
        if (version === autoSaveVersionRef.current) {
          toast("자동 저장하지 못했어요. 다시 변경해 주세요");
        }
      } finally {
        if (version === autoSaveVersionRef.current) setSaving(false);
      }
    }, 650);

    return () => window.clearTimeout(timer);
    // 실제 포메이션 데이터 변경에만 자동 저장한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignByQ, presetByQ, subByQ, isManager, matchId, teamSide]);

  // 현재 쿼터 라인업을 비우면 자동 저장된다.
  function resetQuarter() {
    if (Object.keys(assign).length === 0) return;
    if (!window.confirm(`${quarter}쿼터 라인업을 초기화할까요?`)) return;
    markQuarterInitialized();
    setAssignByQ((s) => ({ ...s, [quarter]: {} }));
    setSubByQ((s) => ({ ...s, [quarter]: [] }));
    setSubstitutionMode(false);
    setSubOut("");
    setSelected(null);
    toast(`${quarter}쿼터 라인업을 비웠어요`);
  }

  function toggleSubstitutionMode() {
    const entering = !substitutionMode;
    setSubstitutionMode(entering);
    setSubOut("");
    setSelected(null);
    setPendingPlayer(null);
    if (entering) {
      window.setTimeout(() => pitchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }

  function removeSubstitution(index: number) {
    markQuarterInitialized();
    setSubByQ((current) => ({
      ...current,
      [quarter]: validSubstitutions(quarter, current[quarter]).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function startShare(qs: number[]) {
    setShareOpen(false);
    setCaptureQs(qs);
  }

  // captureQs가 정해지면 숨은 캡처 노드를 이미지로 만들어 공유/저장
  useEffect(() => {
    if (!captureQs || !captureRef.current) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 80)); // DOM/paint 안정화
      try {
        const dataUrl = await toPng(captureRef.current!, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0b1f14" });
        if (cancelled) return;
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `CLEAR_FC_라인업_${teamLabel ?? `vs_${opponent}`}.png`, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: "CLEAR FC 라인업", text: `CLEAR FC ${lineupTitle} 라인업` });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          a.click();
          toast("라인업 이미지를 저장했어요");
        }
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") toast("공유 이미지를 만들지 못했어요");
      } finally {
        if (!cancelled) setCaptureQs(null);
      }
    })();
    return () => { cancelled = true; };
  }, [captureQs, lineupTitle, opponent, teamLabel]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {QUARTERS.map((q) => (
          <button key={q} onClick={() => selectQuarter(q)} className={`flex-1 rounded-lg py-2 text-[13px] font-medium ${quarter === q ? "bg-navy text-white" : "border border-line bg-card text-muted"}`}>
            {q}쿼터 <span className="text-[10px] opacity-70">{Object.keys(assignByQ[q]).length}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {(saving || saved || dirty) && (
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${dirty && !saving ? "bg-[#fff2df] text-[#b86d12]" : "bg-[#e1f5ee] text-[#0f6e56]"}`}>
              <Check size={11} /> {saving ? "저장 중…" : dirty ? "변경됨" : "저장됨"}
            </span>
          )}
          <span className="truncate text-[13px] text-muted">{lineupTitle} · {preset} · {filled}/11</span>
        </div>
      </div>

      {/* 액션 — 포메이션(드롭다운) · 초기화 · 공유 */}
      <div className="relative flex gap-1.5">
        {isManager && (
          <>
            <button onClick={() => setPresetOpen((v) => !v)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-card py-2.5 text-[12px] font-bold text-fg">
              {preset} <ChevronDown size={13} className="text-subtle" />
            </button>
            {presetOpen && (
              <div className="absolute top-[calc(100%+6px)] left-0 z-10 w-40 overflow-hidden rounded-xl border border-line bg-card soft-card">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => { applyPreset(name); setPresetOpen(false); }}
                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-[13px] ${preset === name ? "bg-tint font-bold text-accent" : "text-fg"}`}
                  >
                    {name} {preset === name && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
            <button onClick={resetQuarter} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-card py-2.5 text-[12px] text-muted">
              <RotateCcw size={13} /> 초기화
            </button>
          </>
        )}
        <button onClick={() => setShareOpen((v) => !v)} disabled={captureQs != null} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy py-2.5 text-[12px] font-medium text-white disabled:opacity-60">
          <Share2 size={13} /> {captureQs != null ? "생성 중…" : "공유"}
        </button>
      </div>

      {/* 공유 범위 선택 */}
      {shareOpen && (
        <div className="rounded-xl border border-line bg-card soft-card p-3">
          <div className="mb-2.5 text-center text-[13px] font-medium">무엇을 공유할까요?</div>
          <div className="flex gap-2">
            <button onClick={() => startShare([quarter])} className="flex-1 rounded-[10px] border border-line bg-card py-2.5 text-center text-[13px] font-medium">
              이번 쿼터만<br /><span className="text-[11px] text-subtle">{quarter}쿼터</span>
            </button>
            <button onClick={() => startShare(QUARTERS)} className="flex-1 rounded-[10px] bg-navy py-2.5 text-center text-[13px] font-medium text-white">
              전체 쿼터<br /><span className="text-[11px] text-white/70">1~4쿼터 한 장</span>
            </button>
          </div>
          <button onClick={() => setShareOpen(false)} className="mt-2 w-full py-1 text-[12px] text-subtle">취소</button>
        </div>
      )}

      <div className="text-center text-[11px] text-subtle">
        {!isManager
          ? "라인업 보기 · 쿼터 탭으로 전환"
          : substitutionMode
            ? subOut
              ? `${nameById.get(subOut)?.name ?? ""} OUT · 아래에서 IN 선수를 탭하세요`
              : "교체할 OUT 선수를 작전판에서 탭하세요"
          : pendingPlayer
            ? `${nameById.get(pendingPlayer)?.name ?? ""} 선수를 넣을 자리를 탭하세요`
            : selected !== null
              ? `${slots[selected].label} 자리 · 아래에서 선수를 탭하세요`
              : "빈 자리·선수를 탭해 배치 · 배치된 선수는 드래그로 위치 교환"}
      </div>

      {/* 피치 */}
      <div ref={pitchRef} className="relative w-full select-none">
        <Pitch />
        <div className="absolute inset-0">
          {slots.map((slot, i) => {
            const pid = assign[i];
            const player = pid ? nameById.get(pid) : null;
            const isSel = selected === i;
            const droppable = !!pendingPlayer && !player;
            const canSelectOut = !!player && !usedSubOutIds.has(pid!);
            return (
              <button
                key={i}
                onClick={() => slotClick(i)}
                onPointerDown={(e) => slotPointerDown(e, i)}
                onPointerMove={slotPointerMove}
                onPointerUp={slotPointerUp}
                style={{
                  position: "absolute",
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  transform: "translate(-50%,-50%)",
                  touchAction: "none",
                  opacity: dragFrom === i ? 0.35 : substitutionMode && !canSelectOut ? 0.35 : 1,
                }}
                className="flex flex-col items-center"
              >
                {player ? (
                  <>
                    <span className="relative">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-medium leading-none text-white shadow-md ${
                          substitutionMode && subOut === pid ? "border-[#ffd166] ring-2 ring-[#ffd166]/45" : "border-white"
                        }`}
                        style={{ background: POSITION_COLOR[groupOf(slot.label)] }}
                      >
                        {slot.label}
                      </span>
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white/90 px-1 text-[8px] font-extrabold leading-none text-white" style={{ background: quarterBadgeColor(qCount(pid), recLo, recHi) }}>
                        {qCount(pid)}Q
                      </span>
                    </span>
                    <span className="mt-0.5 text-[10px] text-white" style={{ textShadow: "0 1px 2px #000" }}>{player.name}</span>
                  </>
                ) : (
                  <>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-medium leading-none ${isSel || droppable ? "border-solid border-white bg-white/25 text-white" : "border-dashed border-white/60 text-white/80"}`}>
                      {slot.label}
                    </span>
                    <span className="mt-0.5 text-[9px] text-white/60">비어있음</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {dragFrom !== null && dragPos && assign[dragFrom] && (
          <div style={{ position: "absolute", left: dragPos.x, top: dragPos.y, transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 20 }} className="flex flex-col items-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium leading-none text-white shadow-lg" style={{ background: POSITION_COLOR[groupOf(slots[dragFrom].label)] }}>
              {slots[dragFrom].label}
            </span>
          </div>
        )}
      </div>

      {/* 교체 — OUT은 현재 배치 선수, IN은 현재 미배정 선수만 선택 */}
      <div className="rounded-xl border border-divider bg-card soft-card p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-fg">교체</div>
            <div className="mt-0.5 text-[10.5px] text-subtle">OUT·IN 선수 모두 이번 쿼터 0.5Q로 계산</div>
          </div>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold text-muted">
            {currentSubstitutions.length}건
          </span>
        </div>

        {currentSubstitutions.length > 0 && (
          <div className="mb-2.5 space-y-1.5">
            {currentSubstitutions.map((item, index) => (
              <div key={`${item.outMemberId}:${item.inMemberId}`} className="flex items-center gap-2 rounded-lg bg-sunken px-2.5 py-2">
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-red">
                  {nameById.get(item.outMemberId)?.name} OUT
                </span>
                <ArrowRight size={13} className="shrink-0 text-subtle" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-blue">
                  {nameById.get(item.inMemberId)?.name} IN
                </span>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => removeSubstitution(index)}
                    aria-label="교체 삭제"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-card hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isManager && (() => {
          const hasAvailableOut = Object.values(assign).some((memberId) => !usedSubOutIds.has(memberId));
          const hasAvailableIn = bench.some((player) => !usedSubInIds.has(player.id));
          const canAdd = hasAvailableOut && hasAvailableIn;

          return canAdd || substitutionMode ? (
            <button
              type="button"
              onClick={toggleSubstitutionMode}
              className={`w-full rounded-lg py-2.5 text-[12px] font-bold ${
                substitutionMode ? "border border-danger bg-card text-danger" : "bg-navy text-white"
              }`}
            >
              {substitutionMode ? "교체 선택 취소" : "교체 추가"}
            </button>
          ) : (
            <div className="rounded-lg bg-sunken px-3 py-2.5 text-center text-[11px] text-subtle">
              {filled === 0 ? "먼저 작전판에 선수를 배치해 주세요" : bench.length === 0 ? "교체 가능한 미배정 선수가 없어요" : "추가 가능한 교체가 없어요"}
            </div>
          );
        })()}
      </div>

      {/* 벤치 (운영진만 편집) */}
      {isManager && (
      <div ref={benchRef} className="rounded-xl border border-divider bg-card soft-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[12px] text-muted">
            {substitutionMode ? (
              subOut
                ? <span className="text-blue">{nameById.get(subOut)?.name} OUT · 교체할 IN 선수 선택</span>
                : <span className="text-red">작전판에서 OUT 선수를 먼저 선택하세요</span>
            ) : pendingPlayer ? (
              <span className="text-accent">{nameById.get(pendingPlayer)?.name} 선택됨 · 자리를 탭하세요</span>
            ) : selected !== null ? (
              <span className="text-red">{slots[selected].label} 자리에 넣을 선수 선택</span>
            ) : (
              <>미배정 <span className="text-faint">{bench.length}명</span> · 탭하면 배치</>
            )}
          </div>
          {!substitutionMode && bench.length > 0 && pendingPlayer === null && selected === null && (
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setBenchSort("name")}
                className={`rounded-md px-2 py-1 text-[11px] font-bold ${benchSort === "name" ? "bg-navy text-white" : "bg-sunken text-muted"}`}
              >
                이름순
              </button>
              <button
                onClick={() => setBenchSort("low")}
                className={`rounded-md px-2 py-1 text-[11px] font-bold ${benchSort === "low" ? "bg-navy text-white" : "bg-sunken text-muted"}`}
              >
                덜 뛴 순
              </button>
            </div>
          )}
        </div>

        {!substitutionMode && bench.length > 0 && (
          <div className="mb-2.5 rounded-lg bg-sunken px-2.5 py-1.5 text-[11px] text-subtle">
            평균 <b className="text-accent">{avgQ.toFixed(1)}</b>쿼터 · 참석 {pool.length}명
          </div>
        )}

        {substitutionMode && !subOut ? (
          <div className="py-3 text-center text-[12px] text-faint">OUT 선수를 선택하면 교체 가능한 선수만 표시돼요</div>
        ) : bench.length === 0 ? (
          <div className="py-1 text-center text-[12px] text-faint">전원 배치됨</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sortedBench.filter((player) => !substitutionMode || !usedSubInIds.has(player.id)).map((p) => {
              const active = pendingPlayer === p.id;
              const c = qCount(p.id);
              const low = !active && c < recLo;
              return (
                <button
                  key={p.id}
                  onClick={() => fillFromBench(p.id)}
                  style={low ? { borderColor: quarterBadgeColor(c, recLo, recHi) } : undefined}
                  className={`flex items-center gap-1.5 rounded-[11px] border px-2.5 py-2 text-[13px] ${active ? "border-accent bg-tint font-bold text-accent" : low ? "bg-sunken" : "border-line bg-sunken"}`}
                >
                  {substitutionMode ? <ArrowRight size={13} className="text-blue" /> : <Plus size={13} className={active ? "text-accent" : "text-subtle"} />}
                  <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                  <span className="flex h-[18px] min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-white" style={{ background: quarterBadgeColor(c, recLo, recHi) }}>
                    {c}Q
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isManager && !substitutionMode && (
          <div className="mt-3 border-t border-divider pt-3">
            <button onClick={() => setShowRoster((v) => !v)} className="flex items-center gap-1 text-[12px] text-blue">
              <UserPlus size={13} /> 명단 관리 (대리 참석·제거)
            </button>
            {showRoster && (() => {
              const q = manageQ.trim();
              const memberPool = pool.filter((p) => !p.id.startsWith("guest:"));
              const list = (manageTab === "add" ? roster : memberPool).filter((m) => m.name.includes(q));
              return (
                <div className="mt-2.5 space-y-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => switchManageTab("add")} className={`flex-1 rounded-lg py-1.5 text-[12px] font-bold ${manageTab === "add" ? "bg-navy text-white" : "bg-sunken text-muted"}`}>미참석 추가 {roster.length}</button>
                    <button onClick={() => switchManageTab("del")} className={`flex-1 rounded-lg py-1.5 text-[12px] font-bold ${manageTab === "del" ? "bg-navy text-white" : "bg-sunken text-muted"}`}>참석자 제거 {memberPool.length}</button>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-2">
                    <Search size={14} className="text-subtle" />
                    <input value={manageQ} onChange={(e) => setManageQ(e.target.value)} placeholder="이름 검색" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
                  </div>

                  {list.length === 0 ? (
                    <div className="py-3 text-center text-[12px] text-faint">{manageTab === "add" ? "추가할 미참석 회원이 없어요" : "참석자가 없어요"}</div>
                  ) : (
                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                      {list.map((m) => {
                        const on = manageSel.has(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleManageSel(m.id)}
                            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left ${on ? "border-accent bg-tint" : "border-line bg-card"}`}
                          >
                            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${on ? "border-accent bg-accent" : "border-line"}`}>
                              {on && <Check size={12} className="text-white" />}
                            </span>
                            <span className="flex-1 text-[13px]">{m.name}</span>
                            {m.number != null && <span className="text-[11px] text-subtle">{m.number}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={applyManage}
                    disabled={manageSel.size === 0}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-40 ${manageTab === "add" ? "bg-accent" : "bg-danger"}`}
                  >
                    {manageTab === "add" ? <UserPlus size={14} /> : <UserMinus size={14} />}
                    {manageSel.size ? `선택 ${manageSel.size}명 ${manageTab === "add" ? "참석 추가" : "제거"}` : `${manageTab === "add" ? "추가" : "제거"}할 회원 선택`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      )}

      {/* 숨은 캡처 노드 (공유 이미지 생성용) */}
      {captureQs && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={captureRef} style={{ width: 380, background: "#0b1f14", padding: "18px 16px 14px", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              {/* 캡처 이미지는 항상 짙은 배경이므로 다크 배경용 로고를 사용한다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(150deg,#16a085,#20302d)", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/logo/clear-lion-mark-dark.png" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /></div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>CLEAR FC <span style={{ color: "#b8d8ce", fontWeight: 400 }}>{lineupTitle}</span></div>
            </div>
            {captureQs.map((q) => (
              <div key={q} style={{ marginBottom: 14 }}>
                <div style={{ color: "#cfe0c9", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{q}쿼터 · {presetByQ[q]}</div>
                <div style={{ position: "relative", width: "100%", height: 220, borderRadius: 12, overflow: "hidden", background: "linear-gradient(160deg,#0f3d24,#0a2417)" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "50%", borderBottom: "1px solid rgba(255,255,255,.12)" }} />
                  <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 60, height: 26, border: "1px solid rgba(255,255,255,.2)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
                  {PRESETS[presetByQ[q]].map((slot, i) => {
                    const pid = assignByQ[q][i];
                    if (!pid) return null;
                    const player = nameById.get(pid);
                    if (!player) return null;
                    return (
                      <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", width: 64 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", background: POSITION_COLOR[groupOf(slot.label)], color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{slot.label}</div>
                        <div style={{ marginTop: 2, fontSize: 9, color: "#fff", textShadow: "0 1px 2px #000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 64 }}>{player.name}</div>
                      </div>
                    );
                  })}
                </div>
                {validSubstitutions(q).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                    {validSubstitutions(q).map((item) => (
                      <div key={`${item.outMemberId}:${item.inMemberId}`} style={{ borderRadius: 7, background: "rgba(255,255,255,.08)", padding: "4px 7px", color: "#dce9e5", fontSize: 9 }}>
                        {nameById.get(item.outMemberId)?.name} OUT → {nameById.get(item.inMemberId)?.name} IN
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ textAlign: "center", color: "#8aada1", fontSize: 10, marginTop: 2 }}>CLEAR FC</div>
          </div>
        </div>
      )}
    </div>
  );
}
