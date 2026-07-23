"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export function BellButton({ latestAt }: { latestAt: string | null }) {
  const seen = useSyncExternalStore(
    subscribeToStorage,
    () => localStorage.getItem("clearfc_notif_seen"),
    () => null,
  );
  const unread = Boolean(latestAt && (!seen || new Date(latestAt).getTime() > new Date(seen).getTime()));

  return (
    <Link href="/notifications" className="relative" aria-label="알림">
      <Bell size={22} className="text-muted" />
      {unread && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pink" />}
    </Link>
  );
}
