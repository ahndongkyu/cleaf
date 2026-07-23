"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/auth";

// MVP 투표 (그 경기 참석자만) — 1인 1표, 재투표 시 변경
export async function voteMvp(matchId: string, targetId: string) {
  const profile = await getMyProfile();
  const voterId = profile?.member_id as string | null;
  if (!voterId) return;

  const supabase = await createClient();

  // 본인이 그 경기에 참석(going) 했는지 확인 — 참석자만 투표 가능
  const { data: myAttendance } = await supabase
    .from("attendances")
    .select("status")
    .eq("match_id", matchId)
    .eq("member_id", voterId)
    .maybeSingle();
  if (myAttendance?.status !== "going") return;

  await supabase
    .from("mvp_votes")
    .upsert(
      { match_id: matchId, voter_id: voterId, target_id: targetId },
      { onConflict: "match_id,voter_id" },
    );

  revalidatePath(`/matches/${matchId}`);
}
