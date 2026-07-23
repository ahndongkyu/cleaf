"use client";

import { useState } from "react";

const UNSPECIFIED_OPPONENT = "상대팀 미정";

export function OpponentField({ defaultOpponent = "" }: { defaultOpponent?: string }) {
  const initiallyUnspecified = defaultOpponent === UNSPECIFIED_OPPONENT;
  const [opponent, setOpponent] = useState(initiallyUnspecified ? "" : defaultOpponent);
  const [unspecified, setUnspecified] = useState(initiallyUnspecified);
  const value = unspecified ? UNSPECIFIED_OPPONENT : opponent;

  return (
    <section className="rounded-[18px] border border-borderblue bg-card p-3.5 soft-card">
      <input type="hidden" name="opponent" value={value} />
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[15px] font-bold text-fg">상대팀</div>
        <button
          type="button"
          aria-pressed={unspecified}
          onClick={() => setUnspecified((value) => !value)}
          className={`rounded-[10px] border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${unspecified ? "border-accent bg-tint text-accent" : "border-borderblue bg-card text-muted"}`}
        >
          상대팀 미정
        </button>
      </div>
      <input
        value={value}
        disabled={unspecified}
        onChange={(event) => setOpponent(event.target.value)}
        aria-label="상대팀"
        placeholder="상대팀을 입력하세요"
        className="input disabled:cursor-not-allowed disabled:bg-sunken disabled:text-subtle"
      />
    </section>
  );
}
