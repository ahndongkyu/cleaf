"use client";

import { useTransition } from "react";
import { setAttendance } from "@/lib/actions/matches";
import { toast } from "@/lib/toast";

type Status = "going" | "notGoing" | "undecided";

const OPTS: { v: Status; label: string; activeBg: string }[] = [
  { v: "going", label: "참석", activeBg: "var(--vote-going)" },
  { v: "undecided", label: "미정", activeBg: "var(--vote-draw)" },
  { v: "notGoing", label: "불참", activeBg: "var(--vote-lose)" },
];

export function RsvpButtons({ matchId, current }: { matchId: string; current: Status }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {OPTS.map((o) => {
        const active = current === o.v;
        return (
          <button
            key={o.v}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setAttendance(matchId, o.v);
                toast(result?.ok ? `${o.label}(으)로 체크됐어요` : "참석 상태를 저장하지 못했어요");
              })
            }
            className="flex-1 rounded-[12px] py-2.5 text-[13px] font-bold disabled:opacity-60"
            style={
              active
                ? { background: o.activeBg, color: "#fff" }
                : { background: "var(--clearfc-surface-2)", color: "var(--clearfc-muted)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
