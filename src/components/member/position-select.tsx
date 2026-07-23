"use client";

import { useState } from "react";

const MAIN = [
  { v: "FW", l: "FW 공격수" },
  { v: "MF", l: "MF 미드필더" },
  { v: "DF", l: "DF 수비수" },
  { v: "GK", l: "GK 골키퍼" },
];

// 주 포지션별 상세 포지션
export const DETAIL: Record<string, { v: string; l: string }[]> = {
  FW: [{ v: "WF", l: "WF 윙어" }, { v: "CF", l: "CF 중앙 공격수" }],
  MF: [{ v: "CAM", l: "CAM 공격형" }, { v: "CM", l: "CM 중앙" }, { v: "CDM", l: "CDM 수비형" }],
  DF: [{ v: "SB", l: "SB 측면 수비" }, { v: "CB", l: "CB 중앙 수비" }],
  GK: [],
};

export function PositionSelect({ position1, position2 }: { position1?: string; position2?: string }) {
  const [p1, setP1] = useState(position1 || "MF");
  const [p2, setP2] = useState(position2 || "");
  const details = DETAIL[p1] ?? [];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div>
        <div className="mb-1.5 text-xs text-muted">주 포지션</div>
        <select
          name="position1"
          value={p1}
          onChange={(e) => { setP1(e.target.value); setP2(""); }}
          className="input"
        >
          {MAIN.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <div>
        <div className="mb-1.5 text-xs text-muted">상세 포지션 {details.length === 0 && <span className="text-faint">(없음)</span>}</div>
        <select
          name="position2"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          className="input"
          disabled={details.length === 0}
        >
          <option value="">선택 안 함</option>
          {details.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
    </div>
  );
}
