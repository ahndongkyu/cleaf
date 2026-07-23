"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function SeasonSelector({ seasons, current }: { seasons: number[]; current: number }) {
  const router = useRouter();
  return (
    <div className="relative inline-flex items-center rounded-[20px] border border-divider bg-card pl-3 pr-7 py-1.5">
      <select
        value={current}
        onChange={(e) => router.push(`/stats?season=${e.target.value}`)}
        className="appearance-none bg-transparent text-[13px] text-muted outline-none"
      >
        {seasons.map((y) => (
          <option key={y} value={y}>
            {y} 시즌
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-subtle" />
    </div>
  );
}
