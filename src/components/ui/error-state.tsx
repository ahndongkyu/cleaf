"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-divider bg-card p-6 text-center soft-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-danger/10 text-danger">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 text-[17px] font-extrabold text-fg">처리 중 문제가 발생했어요</h1>
        <p className="mt-1.5 text-[12px] leading-relaxed text-subtle">
          입력한 내용은 저장되지 않았을 수 있어요. 다시 시도해 주세요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/" className="rounded-[11px] border border-divider py-2.5 text-[13px] font-bold text-muted">
            홈으로
          </Link>
          <button onClick={reset} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-accent py-2.5 text-[13px] font-bold text-white">
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
