"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { saveSubscription, removeSubscription } from "@/lib/actions/push";
import { toast } from "@/lib/toast";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    // 아이폰은 홈 화면에 추가(PWA 설치)해서 앱으로 열어야만 푸시가 됨 (Safari 탭에선 미지원)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const initialize = window.setTimeout(() => {
      setSupported(ok);
      setIosNeedsInstall(isIOS && !standalone);
    }, 0);
    if (ok) {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => setEnabled(!!s)).catch(() => {});
    }
    return () => window.clearTimeout(initialize);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast("알림 권한이 거부됐어요");
        setBusy(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const j = sub.toJSON();
      await saveSubscription({ endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth });
      setEnabled(true);
      toast("알림이 켜졌어요");
    } catch {
      toast("알림을 켤 수 없어요");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast("알림이 꺼졌어요");
    } catch {
      /* noop */
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Bell size={19} className="text-blue" />
      <div className="flex-1">
        <div className="text-sm">푸시 알림</div>
        <div className="text-[11px] text-subtle">
          {iosNeedsInstall
            ? "아이폰은 '홈 화면에 추가' 후 앱에서 켜주세요"
            : supported === false
              ? "이 기기는 지원 안 함"
              : enabled
                ? "새 공지·경기 알림 받는 중"
                : "공지·경기 알림 받기"}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={enabled ? disable : enable}
        disabled={busy || supported === null || supported === false}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40"
        style={{ background: enabled ? "var(--clearfc-blue)" : "var(--clearfc-faint)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ left: enabled ? "22px" : "2px" }}
        />
      </button>
    </div>
  );
}
