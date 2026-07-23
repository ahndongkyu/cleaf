"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isDark = mounted && theme === "dark";

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Moon size={19} className="text-accent" />
      <div className="flex-1">
        <div className="text-sm">다크 모드</div>
        <div className="text-[11px] text-muted">{isDark ? "어두운 화면" : "밝은 화면"}</div>
      </div>
      <button
        role="switch"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: isDark ? "var(--clearfc-blue)" : "var(--clearfc-faint)" }}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: isDark ? "22px" : "2px" }} />
      </button>
    </div>
  );
}
