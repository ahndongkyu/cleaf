"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export function BellButton({ latestAt }: { latestAt: string | null }) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (!latestAt) return;
    const seen = localStorage.getItem("clearfc_notif_seen");
    setUnread(!seen || new Date(latestAt).getTime() > new Date(seen).getTime());
  }, [latestAt]);

  return (
    <Link href="/notifications" className="relative" aria-label="알림">
      <Bell size={22} className="text-muted" />
      {unread && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pink" />}
    </Link>
  );
}
