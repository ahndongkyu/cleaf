"use client";

import Link from "next/link";
import { Shirt, Lock, ChevronRight } from "lucide-react";

type Status = "going" | "notGoing" | "undecided";

const LABEL: Record<Status, string> = { going: "참석", notGoing: "불참", undecided: "미정" };
const BG: Record<Status, string> = { going: "var(--vote-going)", notGoing: "var(--vote-lose)", undecided: "var(--vote-draw)" };

export function NextMatchActions({
  matchId,
  current,
  hasLineup,
}: {
  matchId: string;
  current: Status;
  hasLineup: boolean;
}) {
  const chosen = current === "going" || current === "notGoing";

  return (
    <div className="flex gap-2">
      <Link
        href={`/matches/${matchId}/attend`}
        className="flex flex-1 items-center justify-center gap-1 rounded-[12px] py-2.5 text-[13px] font-bold"
        style={chosen ? { background: BG[current], color: "#fff" } : { background: "var(--clearfc-blue-tint)", color: "var(--clearfc-blue-tint-tx)" }}
      >
        {chosen ? `${LABEL[current]} · 투표` : "참석 투표하기"} <ChevronRight size={14} className="opacity-70" />
      </Link>

      {hasLineup ? (
        <Link
          href={`/matches/${matchId}/formation`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-tint py-2.5 text-[13px] font-bold text-accent"
        >
          <Shirt size={15} /> 라인업
        </Link>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-sunken py-2.5 text-[13px] font-medium text-subtle">
          <Lock size={14} /> 라인업 준비중
        </div>
      )}
    </div>
  );
}
