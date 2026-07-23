"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export function KakaoLoginButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={() => {
        setLoading(true);
        window.location.href = "/auth/kakao/login";
      }}
      disabled={loading}
      className="mb-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#fee500] py-3.5 text-sm font-medium text-[#3c1e1e] disabled:opacity-60"
    >
      <MessageCircle size={18} /> {loading ? "이동 중…" : "카카오로 시작하기"}
    </button>
  );
}
