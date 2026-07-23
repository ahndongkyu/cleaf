"use client";

import { useState } from "react";
import { submitClaimName } from "@/lib/actions/approvals";
import { AWAY_UNIFORM, HOME_UNIFORM } from "@/lib/uniforms";

const MAIN = ["FW", "MF", "DF", "GK"] as const;
const MAIN_COLOR: Record<string, string> = { FW: "#e8568a", MF: "#1d9e75", DF: "#2e6bff", GK: "#e8912b" };
const DETAIL: Record<string, [string, string][]> = {
  FW: [["WF", "윙어"], ["CF", "중앙 공격수"]],
  MF: [["CAM", "공격형 MF"], ["CM", "중앙 MF"], ["CDM", "수비형 MF"]],
  DF: [["SB", "측면 수비"], ["CB", "중앙 수비"]],
  GK: [],
};

export function SignupForm({
  defaultName,
  defaultPos1,
  defaultPos2,
  defaultNumRed,
  defaultNumBlue,
  submitted,
}: {
  defaultName: string;
  defaultPos1: string;
  defaultPos2: string;
  defaultNumRed: string;
  defaultNumBlue: string;
  submitted: boolean;
}) {
  const [p1, setP1] = useState(defaultPos1 || "MF");
  const [p2, setP2] = useState(defaultPos2 || "");
  const details = DETAIL[p1] ?? [];
  const complete = Boolean(p1 && (details.length === 0 || p2));

  return (
    <form action={submitClaimName} className="relative space-y-3.5 text-left">
      <input type="hidden" name="position1" value={p1} />
      <input type="hidden" name="position2" value={details.length ? p2 : ""} />

      <div>
        <div className="mb-1.5 text-[11.5px] font-semibold text-navy-muted">이름</div>
        <input
          name="name"
          required
          defaultValue={defaultName}
          placeholder="예: 홍길동"
          className="w-full rounded-[10px] border border-navy-soft bg-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-navy-muted"
        />
      </div>

      <div>
        <div className="mb-1.5 text-[11.5px] font-semibold text-navy-muted">주 포지션</div>
        <div className="flex gap-1.5">
          {MAIN.map((m) => {
            const on = p1 === m;
            return (
              <button
                type="button"
                key={m}
                onClick={() => { setP1(m); setP2(""); }}
                className="flex-1 rounded-lg border py-2 text-[12.5px] font-bold"
                style={on ? { background: MAIN_COLOR[m], borderColor: "transparent", color: "#fff" } : { borderColor: "#33406a", background: "rgba(255,255,255,.05)", color: "#9fb0d0" }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {details.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11.5px] font-semibold text-navy-muted">상세 포지션 <span className="text-red">*</span></div>
          <div className="flex flex-wrap gap-1.5">
            {details.map(([v, l]) => {
              const on = p2 === v;
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => setP2(on ? "" : v)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${on ? "border-transparent bg-[#2e6bff] text-white" : "border-navy-soft bg-white/5 text-navy-muted"}`}
                >
                  {v} · {l}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[11.5px] font-semibold text-navy-muted">유니폼별 등번호 <span className="text-red">*</span></div>
        <div className="flex gap-2">
          <NumberField uniform={HOME_UNIFORM} color="#e83d4f" name="num_red" defaultValue={defaultNumRed} />
          <NumberField uniform={AWAY_UNIFORM} color="#1976c9" name="num_blue" defaultValue={defaultNumBlue} />
        </div>
      </div>

      <button disabled={!complete} className="mt-1 w-full rounded-[11px] bg-red py-3 text-[14px] font-bold text-white disabled:opacity-40">
        {submitted ? "수정하기" : "가입 신청하기"}
      </button>
    </form>
  );
}

function NumberField({ uniform, color, name, defaultValue }: { uniform: string; color: string; name: string; defaultValue: string }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-[10px] border border-navy-soft bg-white/[0.06] px-2.5 py-2">
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="shrink-0 text-[12px] text-navy-muted">{uniform}</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        required
        min={0}
        max={99}
        defaultValue={defaultValue}
        placeholder="번호"
        className="w-full min-w-0 border-none bg-transparent py-0.5 text-right text-[14px] text-white placeholder:text-navy-soft outline-none"
      />
    </div>
  );
}
