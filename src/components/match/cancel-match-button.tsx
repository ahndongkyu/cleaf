"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cancelMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

const REASONS = ["우천 취소", "인원 부족", "상대팀 사정", "기타"] as const;

export function CancelMatchButton({ matchId, compact = false }: { matchId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reasonType, setReasonType] = useState<(typeof REASONS)[number]>("우천 취소");
  const [detail, setDetail] = useState("우천 취소");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`flex items-center justify-center rounded-[10px] border border-danger/40 text-danger ${compact ? "w-full py-2.5 text-[12px] font-medium" : "w-full py-2.5 text-[13px] font-medium"}`}>
        경기 취소
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <form action={cancelMatch} onClick={(event) => event.stopPropagation()} className="w-full max-w-[480px] rounded-t-[26px] bg-card px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:rounded-[26px]">
            <input type="hidden" name="id" value={matchId} />
            <input type="hidden" name="reason_type" value={reasonType} />
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h2 className="text-[19px] font-extrabold tracking-[-0.035em] text-fg">경기를 취소할까요?</h2>
                <p className="mt-1 text-[11px] leading-4 text-subtle">취소된 경기는 승무패·참여 기록에 반영되지 않습니다.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-muted"><X size={17} /></button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-[12px] font-bold text-fg">취소 사유</label>
              <div className="grid grid-cols-2 gap-2">
                {REASONS.map((reason) => {
                  const selected = reasonType === reason;
                  return (
                    <button key={reason} type="button" onClick={() => { setReasonType(reason); setDetail(reason === "우천 취소" ? "우천 취소" : ""); }} className={`rounded-[12px] border px-3 py-2.5 text-[13px] font-bold ${selected ? "border-accent bg-tint text-accent" : "border-divider bg-sunken text-muted"}`}>
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-[12px] font-bold text-fg">상세 사유 {reasonType === "기타" ? "" : "(선택)"}</span>
              <textarea name="cancel_reason" required={reasonType === "기타"} maxLength={200} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={reasonType === "기타" ? "취소 사유를 입력하세요" : "일정에 표시할 사유를 입력하세요"} className="input min-h-[104px] resize-none py-3" />
            </label>

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-[12px] border border-divider py-3.5 text-[14px] font-bold text-muted">닫기</button>
              <ConfirmSubmit message="경기를 취소 처리하시겠습니까? 취소 후에는 승무패와 참여 기록에 반영되지 않습니다." className="flex-1 rounded-[12px] border border-danger/50 bg-danger/[0.06] py-3.5 text-[14px] font-extrabold text-danger">취소 등록</ConfirmSubmit>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
