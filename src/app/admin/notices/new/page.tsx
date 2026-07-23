import Link from "next/link";
import { BellRing, Send, X } from "lucide-react";
import { createNotice } from "@/lib/actions/notices";
import { NoticeEditor } from "@/components/notice/notice-editor";

export default function NewNoticePage() {
  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/notices" aria-label="작성 취소" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted soft-card">
          <X size={18} />
        </Link>
        <div>
          <h1 className="text-[17px] font-bold text-fg">공지 작성</h1>
          <p className="mt-0.5 text-[11px] text-subtle">팀원에게 전달할 소식을 작성하세요</p>
        </div>
      </div>

      <form action={createNotice} className="space-y-4">
        <div>
          <label htmlFor="notice-title" className="mb-2 block text-[12px] font-bold text-muted">제목</label>
          <input
            id="notice-title"
            name="title"
            required
            maxLength={100}
            placeholder="공지 제목을 입력하세요"
            className="w-full rounded-[16px] border border-borderblue bg-card px-4 py-3.5 text-[16px] font-bold text-fg outline-none soft-card placeholder:font-medium placeholder:text-faint focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12px] font-bold text-muted">내용</label>
          <NoticeEditor />
        </div>

        <div className="flex items-center gap-2.5 rounded-[14px] border border-borderblue bg-tint px-3.5 py-3 text-[11.5px] text-muted">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-accent"><BellRing size={15} /></span>
          등록하면 전체 회원에게 새 공지 알림이 전송됩니다.
        </div>

        <button className="btn-glow flex w-full items-center justify-center gap-2 rounded-[13px] bg-accent py-3.5 text-[14px] font-bold text-white">
          <Send size={16} /> 공지 등록
        </button>
      </form>
    </div>
  );
}
