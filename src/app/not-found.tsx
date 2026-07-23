import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="app-shell flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-divider bg-card p-6 text-center soft-card">
        <SearchX size={34} className="mx-auto text-subtle" />
        <h1 className="mt-3 text-[17px] font-extrabold text-fg">페이지를 찾을 수 없어요</h1>
        <p className="mt-1 text-[12px] text-subtle">삭제됐거나 주소가 변경된 페이지예요.</p>
        <Link href="/" className="mt-5 block rounded-[11px] bg-accent py-2.5 text-[13px] font-bold text-white">
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
