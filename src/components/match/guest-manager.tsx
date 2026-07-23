"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addGuest, deleteGuest, setGuestTeamSide } from "@/lib/actions/guests";
import { toast } from "@/lib/toast";
import { POSITION_BADGE, type Position } from "@/lib/mock";

type Guest = { id: string; name: string; position1: Position; team_side: "red" | "sky" | null };
const POS = ["FW", "MF", "DF", "GK"];

export function GuestManager({ matchId, guests, selfMatch = false }: { matchId: string; guests: Guest[]; selfMatch?: boolean }) {
  const [name, setName] = useState("");
  const [pos, setPos] = useState("MF");
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="mb-2 text-[13px] text-muted">용병 <span className="text-faint">{guests.length}명</span></div>

      {guests.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {guests.map((g) => {
            const badge = POSITION_BADGE[g.position1];
            const anonymized = g.name === "용병";
            return (
              <div key={g.id} className="flex items-center gap-2.5 rounded-[10px] border border-divider bg-card px-2.5 py-2">
                <span className="rounded-[10px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{g.position1}</span>
                <span className="flex-1 text-[13px]">
                  {g.name}
                  {!anonymized && <span className="ml-1 text-[10px] text-faint">용병</span>}
                </span>
                {selfMatch && (
                  <select
                    value={g.team_side ?? "red"}
                    onChange={(event) => start(() => setGuestTeamSide(matchId, g.id, event.target.value === "red" || event.target.value === "sky" ? event.target.value : "red"))}
                    className="rounded-md border border-divider bg-card px-1.5 py-1 text-[11px]"
                    aria-label={`${g.name} 팀 배정`}
                  >
                    <option value="red">레드</option>
                    <option value="sky">블루</option>
                  </select>
                )}
                <button onClick={() => { if (!window.confirm(`${anonymized ? "용병" : `${g.name} 용병`}을 삭제하시겠습니까?`)) return; start(async () => { await deleteGuest(matchId, g.id); toast("용병이 삭제됐어요"); }); }} aria-label="삭제">
                  <Trash2 size={15} className="text-faint" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="용병 이름"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-subtle"
        />
        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="w-[68px] shrink-0 rounded-lg border border-line bg-card px-2 py-2.5 text-sm outline-none"
        >
          {POS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          disabled={!name.trim() || pending}
          onClick={() => start(async () => { await addGuest(matchId, name, pos); toast(`${name} 용병 추가`); setName(""); })}
          className="flex h-[42px] w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
