import Link from "next/link";
import { notFound } from "next/navigation";
import { Save, X } from "lucide-react";
import { getNotice } from "@/lib/data/notices";
import { updateNotice } from "@/lib/actions/notices";
import { noticeContentHtml, noticePlainText } from "@/lib/notice-content";
import { NoticeEditor } from "@/components/notice/notice-editor";

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notice = await getNotice(id);
  if (!notice) notFound();

  const initialContent = noticeContentHtml(notice.content);

  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/notices/${id}`} aria-label="수정 취소" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted soft-card">
          <X size={18} />
        </Link>
        <div>
          <h1 className="text-[17px] font-bold text-fg">공지 수정</h1>
          <p className="mt-0.5 text-[11px] text-subtle">등록된 공지 내용을 수정하세요</p>
        </div>
      </div>

      <form action={updateNotice} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label htmlFor="notice-title" className="mb-2 block text-[12px] font-bold text-muted">제목</label>
          <input
            id="notice-title"
            name="title"
            required
            maxLength={100}
            defaultValue={notice.title}
            className="w-full rounded-[16px] border border-borderblue bg-card px-4 py-3.5 text-[16px] font-bold text-fg outline-none soft-card placeholder:font-medium placeholder:text-faint focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12px] font-bold text-muted">내용</label>
          <NoticeEditor initialContent={initialContent} initialCharacters={noticePlainText(notice.content).length} />
        </div>

        <button className="btn-glow flex w-full items-center justify-center gap-2 rounded-[13px] bg-accent py-3.5 text-[14px] font-bold text-white">
          <Save size={16} /> 수정 내용 저장
        </button>
        <p className="text-center text-[10.5px] text-subtle">공지 수정 시 별도의 푸시 알림은 발송되지 않습니다</p>
      </form>
    </div>
  );
}
