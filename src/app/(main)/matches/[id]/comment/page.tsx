import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch } from "@/lib/data/matches";
import { getMyProfile } from "@/lib/data/auth";
import { getMatchTalk } from "@/lib/data/comments";
import { TalkView } from "@/components/match/talk-view";

export default async function MatchCommentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, profile] = await Promise.all([getMatch(id), getMyProfile()]);
  if (!match) notFound();

  const myMemberId = (profile?.member_id as string | null) ?? null;
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";
  const talk = await getMatchTalk(id, myMemberId);

  const score = match.score_for !== null ? ` · ${match.score_for} : ${match.score_against}` : "";

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/matches/${id}`} className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">경기 코멘트</span>
        </Link>
        <span className="text-[12px] text-subtle">{match.type === "self" ? "자체전" : `vs ${match.opponent}`}{score}</span>
      </div>

      <TalkView matchId={id} talk={talk} isManager={isManager} canComment={!!myMemberId} />
    </div>
  );
}
