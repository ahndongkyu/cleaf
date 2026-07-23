"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/auth";

export async function addAttendComment(matchId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  const me = await getMyProfile();
  const memberId = (me?.member_id as string | null) ?? null;
  if (!memberId) return;
  const supabase = await createClient();
  await supabase.from("attend_comments").insert({ match_id: matchId, author_id: memberId, body: text });
  revalidatePath(`/matches/${matchId}/attend`);
}

export async function deleteAttendComment(matchId: string, commentId: string) {
  const supabase = await createClient();
  await supabase.from("attend_comments").delete().eq("id", commentId); // RLS: 본인 또는 운영진
  revalidatePath(`/matches/${matchId}/attend`);
}
