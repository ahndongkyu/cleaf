"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

// 리다이렉트 후 ?toast=메시지 를 읽어 토스트 표시하고 URL 정리.
export function ToastFromQuery() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = sp.get("toast");
    if (t) {
      toast(t);
      router.replace(pathname);
    }
  }, [sp, pathname, router]);

  return null;
}
