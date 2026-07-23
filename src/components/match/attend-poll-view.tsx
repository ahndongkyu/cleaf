"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, ChevronDown, Send, X } from "lucide-react";
import { POSITION_COLOR, type Position } from "@/lib/mock";
import { setAttendance } from "@/lib/actions/matches";
import { addAttendComment, deleteAttendComment } from "@/lib/actions/attend";
import type { AttendComment } from "@/lib/data/attend";
import { toast } from "@/lib/toast";

type Status = "going" | "notGoing" | "undecided";
type Person = { name: string; position1: string };

const OPTS: { v: Status; label: string; color: string }[] = [
  { v: "going", label: "참석", color: "#1d9e75" },
  { v: "notGoing", label: "불참", color: "#dc2f3c" },
  { v: "undecided", label: "미정", color: "#9a9a92" },
];

export function AttendPollView({
  matchId,
  title,
  dateLine,
  place,
  groups,
  myStatus: initialMyStatus,
  comments,
  canInteract,
}: {
  matchId: string;
  title: string;
  dateLine: string;
  place: string;
  groups: { going: Person[]; notGoing: Person[]; undecided: Person[]; noResponse: Person[] };
  myStatus: Status | null;
  comments: AttendComment[];
  canInteract: boolean;
}) {
  const router = useRouter();
  const [myStatus, setMyStatus] = useState<Status | null>(initialMyStatus);
  const [counts, setCounts] = useState({ going: groups.going.length, notGoing: groups.notGoing.length, undecided: groups.undecided.length });
  const [showModal, setShowModal] = useState(false);
  const [newC, setNewC] = useState("");
  const [, start] = useTransition();

  const total = counts.going + counts.notGoing + counts.undecided;

  function vote(v: Status) {
    if (!canInteract || v === myStatus) return;
    setCounts((c) => {
      const n = { ...c };
      if (myStatus) n[myStatus] -= 1;
      n[v] += 1;
      return n;
    });
    setMyStatus(v);
    start(async () => { await setAttendance(matchId, v); });
  }

  function submit() {
    if (!newC.trim()) return;
    start(async () => { await addAttendComment(matchId, newC); setNewC(""); router.refresh(); });
  }
  function remove(id: string) {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    start(async () => { await deleteAttendComment(matchId, id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      {/* 투표 카드 */}
      <div className="rounded-2xl border border-line bg-card p-4 soft-card">
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[#fff8ee] px-2.5 py-1.5 text-[11px] font-medium text-[#a5793a]" style={{ border: "1px solid #f0dcae" }}>
          <Clock size={12} /> 경기 시작 전까지 투표할 수 있어요
        </div>
        <div className="mb-3.5">
          <div className="text-[15px] font-extrabold">{title}</div>
          <div className="mt-1 text-[12.5px] text-muted">{dateLine}</div>
          {place && <div className="text-[12.5px] text-muted">{place}</div>}
        </div>

        <div className="space-y-2">
          {OPTS.map((o) => {
            const c = counts[o.v];
            const mine = myStatus === o.v;
            const pct = total ? (c / total) * 100 : 0;
            return (
              <button
                key={o.v}
                onClick={() => vote(o.v)}
                disabled={!canInteract}
                className={`relative w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left disabled:opacity-100 ${mine ? "" : "border-line"}`}
                style={mine ? { borderColor: o.color } : undefined}
              >
                <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: o.color, opacity: 0.13 }} />
                <span className="relative flex items-center gap-2">
                  {mine && <span className="text-[13px] font-extrabold" style={{ color: o.color }}>✓</span>}
                  <span className="flex-1 text-[14px] font-bold">{o.label}</span>
                  <span className="text-[13px] font-extrabold" style={{ color: o.color }}>{c}명</span>
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={() => setShowModal(true)} className="mt-2.5 flex w-full items-center justify-end gap-0.5 text-[12px] font-bold text-muted">
          {total}명 참여 · 명단 보기 <ChevronRight size={14} />
        </button>
      </div>

      {/* 댓글 */}
      <div>
        <div className="mb-3 px-0.5 text-[13px] font-bold">댓글 {comments.length}</div>
        {comments.length === 0 ? (
          <div className="py-5 text-center text-[12px] text-faint">미정이거나 상황 공유할 게 있으면 댓글로 남겨보세요.</div>
        ) : (
          <div className="space-y-3.5">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: POSITION_COLOR[c.position1 as Position] ?? "#889" }}>{c.authorName.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-bold">
                    {c.authorName}
                    {c.isManagerAuthor && <span className="rounded-[5px] bg-accent px-1 py-px text-[8px] font-bold text-white">{c.title ?? "운영진"}</span>}
                  </div>
                  <div className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-fg">{c.body}</div>
                  <div className="mt-1 flex items-center gap-3 text-[10.5px] text-subtle">
                    <span>{timeago(c.createdAt)}</span>
                    <button onClick={() => remove(c.id)} className="font-bold text-faint">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 댓글 입력 (하단 고정 느낌) */}
      {canInteract && (
        <div className="sticky bottom-2 flex items-center gap-2 rounded-full border border-line bg-card px-2 py-1.5 soft-card">
          <input
            value={newC}
            onChange={(e) => setNewC(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="댓글을 남겨보세요…"
            className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
          />
          <button onClick={submit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d9e75] text-white"><Send size={15} /></button>
        </div>
      )}

      {/* 명단 모달 */}
      {showModal && (
        <AttendModal groups={groups} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function AttendModal({ groups, onClose }: { groups: { going: Person[]; notGoing: Person[]; undecided: Person[]; noResponse: Person[] }; onClose: () => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ 참석: true });
  const G: { k: string; list: Person[]; fixed?: boolean }[] = [
    { k: "참석", list: groups.going, fixed: true },
    { k: "불참", list: groups.notGoing },
    { k: "미정", list: groups.undecided },
    { k: "미응답", list: groups.noResponse },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-divider px-4 py-3.5">
          <span className="text-[15px] font-bold">참석 현황</span>
          <button onClick={onClose}><X size={18} className="text-muted" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-1">
          {G.map((g) => {
            const isOpen = g.fixed || open[g.k];
            return (
              <div key={g.k} className="pt-3">
                <button
                  onClick={() => !g.fixed && setOpen((s) => ({ ...s, [g.k]: !s[g.k] }))}
                  disabled={g.fixed}
                  className="mb-2.5 flex w-full items-center gap-1.5"
                >
                  <span className="text-[13px] font-bold">{g.k}</span>
                  <span className="text-[12px] font-bold text-subtle">{g.list.length}명</span>
                  {!g.fixed && <ChevronDown size={15} className={`ml-auto text-subtle transition-transform ${isOpen ? "" : "-rotate-90"}`} />}
                </button>
                {isOpen && (
                  g.list.length === 0 ? (
                    <div className="pb-1 text-[12px] text-faint">없어요</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {g.list.map((p, i) => (
                        <div key={i} className="truncate rounded-full border-[1.5px] bg-card py-1.5 text-center text-[12px] font-bold text-fg" style={{ borderColor: POSITION_COLOR[p.position1 as Position] ?? "#889" }}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}
