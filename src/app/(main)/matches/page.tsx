import Link from "next/link";
import { Plus } from "lucide-react";
import { getMatches } from "@/lib/data/matches";
import { getMyProfile } from "@/lib/data/auth";
import { MatchList } from "@/components/match/match-list";
import { yearInSeoul } from "@/lib/date";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const [matches, profile, query] = await Promise.all([getMatches(), getMyProfile(), searchParams]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";
  const rawYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const parsedYear = Number(rawYear);
  const initialYear = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
    ? parsedYear
    : yearInSeoul();
  const rawMonth = Array.isArray(query.month) ? query.month[0] : query.month;
  const initialMonth = rawMonth && /^(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : "all";

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">경기 일정</h1>
          <div className="mt-0.5 text-[11px] text-subtle">예정 경기와 지난 결과를 확인하세요</div>
        </div>
        {isManager && (
          <Link href="/admin/matches/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
            <Plus size={15} /> 경기 등록
          </Link>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">아직 등록된 경기가 없어요.</div>
      ) : (
        <MatchList matches={matches} initialYear={initialYear} initialMonth={initialMonth} />
      )}
    </div>
  );
}
