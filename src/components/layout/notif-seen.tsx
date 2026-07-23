"use client";

import { useEffect } from "react";

// 알림 목록을 열면 "본 시각" 기록 → 종 아이콘 빨간 점 해제
export function NotifSeen() {
  useEffect(() => {
    localStorage.setItem("clearfc_notif_seen", new Date().toISOString());
  }, []);
  return null;
}
