import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { getNotices } from "@/lib/data/notices";
import { getMyProfile } from "@/lib/data/auth";
import { formatDateKo } from "@/lib/format";
import { noticePlainText } from "@/lib/notice-content";

export default async function NoticesPage() {
  const [notices, profile] = await Promise.all([getNotices(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  return (
    <div className="-mx-4 -mt-4 space-y-0">
      <header className="relative overflow-hidden bg-[image:var(--clearfc-hero-grad)] px-4 pb-6 pt-4 text-[color:var(--clearfc-on-hero)] shadow-[var(--clearfc-shadow-hero)]">
        <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(var(--clearfc-hero-line)_1px,transparent_1px),linear-gradient(90deg,var(--clearfc-hero-line)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[image:var(--clearfc-hero-glow)]" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <Link href="/more" aria-label="더보기로 돌아가기" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white">
              <ArrowLeft size={18} />
            </Link>
            {isManager && (
              <Link href="/admin/notices/new" className="btn-glow flex items-center gap-1.5 rounded-[11px] bg-accent px-3.5 py-2 text-xs font-extrabold text-white">
                <Plus size={15} /> 작성
              </Link>
            )}
          </div>
          <div className="mt-7 flex items-end gap-2.5">
            <h1 className="text-[28px] font-extrabold tracking-[-0.055em]">공지사항</h1>
            <span className="mb-1 text-sm font-bold tracking-[0.12em] text-[color:var(--clearfc-hero-num)]">{String(notices.length).padStart(2, "0")}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-[color:var(--clearfc-on-hero-sub)]">CLEAR FC의 새로운 소식과 안내를 확인하세요</p>
        </div>
      </header>

      <section className="px-4 pb-4 pt-5">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h2 className="text-[15px] font-extrabold tracking-[-0.03em] text-fg">최근 공지</h2>
          <span className="text-[10px] font-semibold text-subtle">최신순</span>
        </div>

        {notices.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-borderblue bg-card px-4 py-12 text-center">
            <div className="text-[13px] font-bold text-fg">아직 등록된 공지가 없어요</div>
            <div className="mt-1 text-[11px] text-subtle">새로운 팀 소식이 등록되면 여기에 표시됩니다</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-border bg-card soft-card">
            {notices.map((notice, index) => (
              <Link
                key={notice.id}
                href={`/notices/${notice.id}`}
                className={`tap group relative flex min-w-0 items-center gap-3 px-4 py-4 ${index < notices.length - 1 ? "border-b border-divider" : ""}`}
              >
                {index === 0 && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-accent" />}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <strong className="truncate text-[15px] font-extrabold tracking-[-0.025em] text-fg">{notice.title}</strong>
                    {index === 0 && <span className="shrink-0 rounded-full bg-tint px-1.5 py-0.5 text-[9px] font-extrabold text-accent">최신</span>}
                  </div>
                  {notice.content && <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-muted">{noticePlainText(notice.content)}</p>}
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-medium text-subtle">
                    <span>{notice.members?.name ?? "운영진"}</span>
                    <span className="text-faint">·</span>
                    <span>{formatDateKo(notice.created_at.slice(0, 10)).full}</span>
                    <span className="text-faint">·</span>
                    <span>조회 {notice.view_count.toLocaleString()}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
