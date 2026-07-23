"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/auth";

// MVP 투표 (그 경기 참석자만) — 1인 1표, 재투표 시 변경
export async function voteMvp(matchId: string, targetId: string) {
  const profile = await getMyProfile();
  const voterId = profile?.member_id as string | null;
  if (!voterId || !matchId || !targetId) return { ok: false };

  const supabase = await createClient();

  const [{ data: match }, { data: attendances }] = await Promise.all([
    supabase
      .from("matches")
      .select("status, score_for, score_against, mom_vote_close")
      .eq("id", matchId)
      .maybeSingle(),
    supabase
      .from("attendances")
      .select("member_id, status")
      .eq("match_id", matchId)
      .in("member_id", [voterId, targetId]),
  ]);
  const goingIds = new Set((attendances ?? []).filter((row) => row.status === "going").map((row) => row.member_id));
  const voteOpen =
    match?.status === "past" &&
    match.score_for !== null &&
    match.score_against !== null &&
    !!match.mom_vote_close &&
    Date.now() < new Date(match.mom_vote_close).getTime();
  if (!voteOpen || !goingIds.has(voterId) || !goingIds.has(targetId)) return { ok: false };

  const { error } = await supabase
    .from("mvp_votes")
    .upsert(
      { match_id: matchId, voter_id: voterId, target_id: targetId },
      { onConflict: "match_id,voter_id" },
    );
  if (error) return { ok: false };

  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}
