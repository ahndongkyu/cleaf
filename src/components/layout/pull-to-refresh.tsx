"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 66; // 이 이상 당기면 새로고침
const MAX = 90; // 최대 당김(고무줄)
const REST = 40; // 새로고침 중 스피너 정지 위치

// 모바일 당겨서 새로고침 — 최상단에서 아래로 당기면 router.refresh()
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pullRef = useRef(0);
  const refRef = useRef(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    const set = (v: number) => { pullRef.current = v; setPull(v); };

    function onStart(e: TouchEvent) {
      if (refRef.current) return;
      if (window.scrollY <= 0 && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        armed.current = true;
      } else {
        armed.current = false;
        startY.current = null;
      }
    }
    function onMove(e: TouchEvent) {
      if (!armed.current || startY.current === null || refRef.current) return;
      if (window.scrollY > 0) { armed.current = false; set(0); setDragging(false); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { set(0); setDragging(false); return; }
      setDragging(true);
      const damped = Math.min(MAX, Math.pow(dy, 0.85)); // 당길수록 저항
      set(damped);
      if (damped > 4 && e.cancelable) e.preventDefault(); // 네이티브 스크롤/새로고침 억제
    }
    function onEnd() {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;
      setDragging(false);
      if (pullRef.current >= THRESHOLD && !refRef.current) {
        refRef.current = true;
        setRefreshing(true);
        set(REST);
        router.refresh();
        window.setTimeout(() => { refRef.current = false; setRefreshing(false); set(0); }, 800);
      } else {
        set(0);
      }
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const offset = refreshing ? REST : pull;
  const progress = Math.min(1, pull / THRESHOLD);
  const anim = dragging ? "none" : "transform .25s ease";

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", justifyContent: "center", pointerEvents: "none",
          transform: `translateY(${Math.max(0, offset) - 34}px)`,
          transition: anim,
          opacity: offset > 4 ? 1 : 0,
        }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card soft-card" style={{ border: "1px solid var(--clearfc-border)" }}>
          <RefreshCw
            size={17}
            className={refreshing ? "animate-spin text-accent" : "text-muted"}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </span>
      </div>
      <div style={{ transform: offset === 0 ? "none" : `translateY(${offset}px)`, transition: anim }}>{children}</div>
    </>
  );
}
