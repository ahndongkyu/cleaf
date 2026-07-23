"use client";

import { useEffect, useState } from "react";
import { trackNoticeView } from "@/lib/actions/notices";

export function NoticeViewCount({ noticeId, initialCount }: { noticeId: string; initialCount: number }) {
  const [viewCount, setViewCount] = useState(initialCount);

  useEffect(() => {
    let active = true;

    void trackNoticeView(noticeId).then((count) => {
      if (active && count !== null) setViewCount(count);
    });

    return () => {
      active = false;
    };
  }, [noticeId]);

  return <span>조회 {viewCount.toLocaleString()}</span>;
}
