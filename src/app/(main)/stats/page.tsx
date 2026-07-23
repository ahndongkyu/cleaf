import { getMemberStats } from "@/lib/data/stats";
import { RankingList } from "@/components/stats/ranking";
import { SeasonSelector } from "@/components/stats/season-selector";
import { seasonList, normalizeSeason } from "@/lib/season";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const sp = await searchParams;
  const season = normalizeSeason(sp.season ? parseInt(sp.season, 10) : undefined);
  const stats = await getMemberStats(season);

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">기록</h1>
        <SeasonSelector seasons={seasonList()} current={season} />
      </div>

      <div className="text-[12px] text-subtle">개인 랭킹 · 팀 시즌 성적은 홈에서 확인</div>

      <RankingList stats={stats} />
    </div>
  );
}
