"use client";

import { useState } from "react";
import { OpponentField } from "@/components/match/opponent-field";
import { UNIFORM_NAMES } from "@/lib/uniforms";
import { SelfTeamMark } from "@/components/ui/self-team-mark";

export function MatchSetupFields({
  defaultType = "match",
  defaultOpponent = "",
  defaultUniform = "",
}: {
  defaultType?: "match" | "self";
  defaultOpponent?: string;
  defaultUniform?: string;
}) {
  const [type, setType] = useState<"match" | "self">(defaultType);
  const selfMatch = type === "self";

  return (
    <>
      <div className="min-w-0">
        <div className="mb-1.5 text-[11.5px] font-semibold text-muted">경기 유형</div>
        <div className="flex rounded-[13px] border border-borderblue bg-card p-1 soft-card">
          <label className="flex-1">
            <input type="radio" name="type" value="match" checked={type === "match"} onChange={() => setType("match")} className="peer hidden" />
            <span className="block rounded-[9px] py-2.5 text-center text-[13px] font-semibold text-muted transition-colors peer-checked:bg-navy peer-checked:text-white">매치</span>
          </label>
          <label className="flex-1">
            <input type="radio" name="type" value="self" checked={type === "self"} onChange={() => setType("self")} className="peer hidden" />
            <span className="block rounded-[9px] py-2.5 text-center text-[13px] font-semibold text-muted transition-colors peer-checked:bg-navy peer-checked:text-white">자체전</span>
          </label>
        </div>
      </div>

      {selfMatch ? (
        <section className="rounded-[18px] border border-borderblue bg-card p-3.5 soft-card">
          <input type="hidden" name="opponent" value="레드 vs 블루" />
          <input type="hidden" name="uniform" value="" />
          <div className="mb-3 text-[15px] font-bold text-fg">대진</div>
          <div className="flex items-center justify-center gap-5 py-1.5">
            <TeamBadge tone="red" label="레드" />
            <span className="text-[13px] font-bold text-subtle">VS</span>
            <TeamBadge tone="sky" label="블루" />
          </div>
          <p className="mt-3 text-center text-[11px] text-subtle">자체전은 레드와 블루 유니폼으로 진행해요.</p>
        </section>
      ) : (
        <>
          <OpponentField defaultOpponent={defaultOpponent === "레드 vs 스카이" || defaultOpponent === "레드 vs 블루" ? "" : defaultOpponent} />
          <div className="min-w-0">
            <div className="mb-1.5 text-[11.5px] font-semibold text-muted">유니폼</div>
            <select name="uniform" defaultValue={defaultUniform} className="input">
              <option value="">선택 안 함</option>
              {UNIFORM_NAMES.map((uniform) => <option key={uniform} value={uniform}>{uniform}</option>)}
            </select>
          </div>
        </>
      )}
    </>
  );
}

function TeamBadge({ tone, label }: { tone: "red" | "sky"; label: string }) {
  return (
    <div className="w-16 text-center">
      <SelfTeamMark tone={tone === "red" ? "red" : "blue"} />
      <span className="mt-1.5 block text-[12px] font-bold text-fg">{label}</span>
    </div>
  );
}
