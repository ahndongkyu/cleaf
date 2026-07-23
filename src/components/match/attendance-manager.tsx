"use client";

import { useMemo, useState, useTransition } from "react";
import { setAttendanceFor, setAttendanceTeamSide } from "@/lib/actions/matches";
import { setGuestTeamSide } from "@/lib/actions/guests";
import { type Position } from "@/lib/positions";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/lib/toast";

type St = "going" | "notGoing" | "undecided";
type Member = { id: string; name: string; position1: Position };
type Guest = { id: string; name: string; team_side: "red" | "sky" | null };

const PILLS: { v: St; label: string; bg: string }[] = [
  { v: "going", label: "참", bg: "#1d9e75" },
  { v: "notGoing", label: "불", bg: "#dc2f3c" },
  { v: "undecided", label: "미", bg: "#888780" },
];

export function AttendanceManager({
  matchId,
  members,
  guests = [],
  initial,
  selfMatch = false,
}: {
  matchId: string;
  members: Member[];
  guests?: Guest[];
  initial: Record<string, { status: St; source: "self" | "manager"; teamSide: "red" | "sky" | null }>;
  selfMatch?: boolean;
}) {
  const [statuses, setStatuses] = useState<Record<string, St>>(() => {
    const s: Record<string, St> = {};
    for (const m of members) s[m.id] = initial[m.id]?.status ?? "undecided";
    return s;
  });
  const [, start] = useTransition();
  const [sides, setSides] = useState<Record<string, "red" | "sky" | null>>(() => {
    const value: Record<string, "red" | "sky" | null> = {};
    for (const member of members) value[member.id] = initial[member.id]?.teamSide ?? null;
    return value;
  });
  const [guestSides, setGuestSides] = useState<Record<string, "red" | "sky">>(() => {
    const value: Record<string, "red" | "sky"> = {};
    for (const guest of guests) value[guest.id] = guest.team_side ?? "red";
    return value;
  });

  const counts = useMemo(() => {
    const c = { going: 0, notGoing: 0, undecided: 0 };
    for (const m of members) c[statuses[m.id]]++;
    return c;
  }, [statuses, members]);

  function set(id: string, s: St) {
    const previousStatus = statuses[id];
    const previousSide = sides[id];
    setStatuses((prev) => ({ ...prev, [id]: s }));
    if (s !== "going") setSides((prev) => ({ ...prev, [id]: null }));
    start(async () => {
      const result = await setAttendanceFor(matchId, id, s);
      if (!result.ok) {
        setStatuses((prev) => ({ ...prev, [id]: previousStatus }));
        setSides((prev) => ({ ...prev, [id]: previousSide }));
        toast("참석 상태를 변경하지 못했어요");
      }
    });
  }

  function setSelfMatchAttendance(id: string, value: "red" | "sky" | "notGoing") {
    if (value === "notGoing") {
      setStatuses((prev) => ({ ...prev, [id]: "notGoing" }));
      setSides((prev) => ({ ...prev, [id]: null }));
      start(async () => {
        const [sideResult, attendanceResult] = await Promise.all([
          setAttendanceTeamSide(matchId, id, null),
          setAttendanceFor(matchId, id, "notGoing"),
        ]);
        if (!sideResult.ok || !attendanceResult.ok) toast("참석 상태를 변경하지 못했어요");
      });
      return;
    }

    setStatuses((prev) => ({ ...prev, [id]: "going" }));
    setSides((prev) => ({ ...prev, [id]: value }));
    start(async () => {
      const attendanceResult = await setAttendanceFor(matchId, id, "going");
      const sideResult = attendanceResult.ok
        ? await setAttendanceTeamSide(matchId, id, value)
        : { ok: false };
      if (!attendanceResult.ok || !sideResult.ok) toast("팀 배정을 변경하지 못했어요");
    });
  }

  function autoBalance() {
    const participants = [
      ...members.filter((member) => statuses[member.id] === "going").map((member) => ({ kind: "member" as const, id: member.id })),
      ...guests.map((guest) => ({ kind: "guest" as const, id: guest.id })),
    ];
    const next: Record<string, "red" | "sky"> = {};
    participants.forEach((participant, index) => { next[participant.id] = index % 2 === 0 ? "red" : "sky"; });
    setSides((prev) => ({ ...prev, ...Object.fromEntries(participants.filter((p) => p.kind === "member").map((p) => [p.id, next[p.id]])) }));
    setGuestSides((prev) => ({ ...prev, ...Object.fromEntries(participants.filter((p) => p.kind === "guest").map((p) => [p.id, next[p.id]])) }));
    start(async () => {
      const results = await Promise.all(participants.map((participant) =>
        participant.kind === "member"
          ? setAttendanceTeamSide(matchId, participant.id, next[participant.id])
          : setGuestTeamSide(matchId, participant.id, next[participant.id]),
      ));
      if (results.some((result) => !result.ok)) toast("일부 팀 배정을 저장하지 못했어요");
    });
  }

  const redCount = members.filter((member) => statuses[member.id] === "going" && sides[member.id] === "red").length + guests.filter((guest) => guestSides[guest.id] === "red").length;
  const blueCount = members.filter((member) => statuses[member.id] === "going" && sides[member.id] === "sky").length + guests.filter((guest) => guestSides[guest.id] === "sky").length;

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

      {selfMatch && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 rounded-xl border border-divider bg-card py-3 text-center soft-card">
            <Sum v={redCount} l="레드" c="#e95662" />
            <Sum v={counts.notGoing} l="불참" c="#dc2f3c" />
            <Sum v={blueCount} l="블루" c="#68b8e8" />
          </div>
          <button type="button" onClick={autoBalance} className="w-full rounded-[10px] border border-borderblue bg-card py-2.5 text-[12px] font-semibold text-accent">
            참석자 자동 균형 배정
          </button>
        </div>
      )}

      {/* 명단 */}
      <div className="space-y-2">
        {members.map((m) => {
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
              {selfMatch ? (
                <div className="flex gap-1">
                  <TeamButton label="레드" active={cur === "going" && sides[m.id] === "red"} tone="red" onClick={() => setSelfMatchAttendance(m.id, "red")} />
                  <TeamButton label="불참" active={cur === "notGoing"} tone="notGoing" onClick={() => setSelfMatchAttendance(m.id, "notGoing")} />
                  <TeamButton label="블루" active={cur === "going" && sides[m.id] === "sky"} tone="sky" onClick={() => setSelfMatchAttendance(m.id, "sky")} />
                </div>
              ) : (
                <div className="flex gap-1">
                  {PILLS.map((p) => {
                    const active = cur === p.v;
                    return (
                      <button
                        key={p.v}
                        onClick={() => set(m.id, p.v)}
                        className="h-7 w-7 rounded-md text-[12px] font-medium"
                        style={active ? { background: p.bg, color: "#fff" } : { background: "var(--color-surface-1)", color: "#999" }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamButton({ label, active, tone, onClick }: { label: string; active: boolean; tone: "red" | "sky" | "notGoing"; onClick: () => void }) {
  const activeClass = tone === "red"
    ? "border-danger/40 bg-danger/10 text-danger"
    : tone === "sky"
      ? "border-[#68b8e8] bg-[#68b8e8]/15 text-[#3989b8]"
      : "border-danger/40 bg-danger/10 text-danger";
  return <button type="button" onClick={onClick} className={`rounded-md border px-2 py-1 text-[10px] font-bold ${active ? activeClass : "border-divider bg-card text-faint"}`}>{label}</button>;
}

function Sum({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <div className="text-center">
      <div className="text-[18px] font-medium" style={{ color: c }}>{v}</div>
      <div className="mt-0.5 text-[11px] text-navy-muted">{l}</div>
    </div>
  );
}
