"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { appVersion } from "@/lib/app-version";

type UpdateState = "idle" | "updating" | "complete";

const DISMISSED_KEY = "clearfc-dismissed-update-version";
const CHECK_INTERVAL = 15 * 60 * 1000;

export function AppUpdateBanner() {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [state, setState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const mounted = useRef(true);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store" });
      if (!res.ok) return;
      const { version } = (await res.json()) as { version?: string };
      if (!version) return;
      if (version !== appVersion && sessionStorage.getItem(DISMISSED_KEY) !== version) {
        setAvailableVersion(version);
      }
    } catch {
      // 업데이트 확인 실패는 현재 앱 사용에 영향을 주지 않는다.
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initialCheck = window.setTimeout(() => void checkForUpdate(), 0);
    const interval = window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkForUpdate]);

  async function applyUpdate() {
    if (state !== "idle") return;
    setState("updating");
    setProgress(0);

    const steps: Array<[number, number]> = [[34, 220], [76, 420], [100, 300]];
    for (const [nextProgress, wait] of steps) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (!mounted.current) return;
      setProgress(nextProgress);
    }

    setState("complete");
    window.setTimeout(() => window.location.reload(), 320);
  }

  function dismiss() {
    if (availableVersion) sessionStorage.setItem(DISMISSED_KEY, availableVersion);
    setAvailableVersion(null);
  }

  if (!availableVersion) return null;

  const isUpdating = state !== "idle";
  const message = state === "complete" ? "업데이트 완료" : isUpdating ? "최신 버전 적용 중" : "새 버전이 준비됐어요";

  return (
    <div
      className="fixed z-30"
      style={{ left: "50%", bottom: "calc(76px + env(safe-area-inset-bottom))", width: "min(calc(100% - 32px), 448px)", transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#14213d] px-3.5 py-3 shadow-[0_14px_30px_-14px_rgba(20,33,61,0.8)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#55d6b6]/15 text-[#6ee4c7]">
            <RefreshCw size={18} className={isUpdating ? "animate-spin" : ""} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-white">{message}</div>
            {isUpdating ? (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-[#55d6b6] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
                <span className="w-8 text-right text-[10.5px] font-semibold tabular-nums text-[#a5f2df]">{progress}%</span>
              </div>
            ) : (
              <div className="mt-0.5 text-[10.5px] text-white/55">지금 업데이트하면 최신 기능을 이용할 수 있어요</div>
            )}
          </div>
          {isUpdating ? null : (
            <>
              <button onClick={applyUpdate} className="update-attention rounded-[10px] bg-[#55d6b6] px-3 py-2 text-[11.5px] font-extrabold text-[#12322d]">
                업데이트
              </button>
              <button onClick={dismiss} className="-mr-1 p-1 text-white/45" aria-label="업데이트 안내 닫기">
                <X size={17} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
