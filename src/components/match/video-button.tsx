"use client";

// 유튜브 영상 열기 — 모바일에선 유튜브 앱 우선(스킴/인텐트), 미설치·PC는 웹으로 폴백
function videoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

export function VideoButton({ url, className, children }: { url: string; className?: string; children: React.ReactNode }) {
  function open() {
    const id = videoId(url);
    const https = id ? `https://www.youtube.com/watch?v=${id}` : url;
    const ua = navigator.userAgent;

    if (!id) {
      window.open(https, "_blank");
      return;
    }

    if (/android/i.test(ua)) {
      // 인텐트 — 앱 있으면 앱으로(현재 화면 유지), 없으면 브라우저 폴백만
      window.location.href =
        `intent://www.youtube.com/watch?v=${id}#Intent;package=com.google.android.youtube;scheme=https;` +
        `S.browser_fallback_url=${encodeURIComponent(https)};end`;
      return;
    }

    if (/iphone|ipad|ipod/i.test(ua)) {
      // iOS: 앱 우선. 앱이 열려 화면이 백그라운드로 가면 웹 폴백을 취소(CLEAR FC 화면 유지).
      // 앱이 안 열릴 때(미설치)만 웹으로.
      let backgrounded = false;
      const mark = () => { backgrounded = true; };
      const onVis = () => { if (document.hidden) backgrounded = true; };
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pagehide", mark);
      window.addEventListener("blur", mark);
      window.setTimeout(() => {
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("pagehide", mark);
        window.removeEventListener("blur", mark);
        if (!backgrounded && !document.hidden) window.open(https, "_blank");
      }, 1300);
      window.location.href = `youtube://watch?v=${id}`;
      return;
    }

    window.open(https, "_blank");
  }
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
