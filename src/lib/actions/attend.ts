"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/auth";
import { boundedText, LIMITS } from "@/lib/validation";

export async function addAttendComment(matchId: string, body: string) {
  const text = boundedText(body, LIMITS.comment);
  if (!matchId || !text) return { ok: false };
  const me = await getMyProfile();
  const memberId = (me?.member_id as string | null) ?? null;
  if (!memberId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("attend_comments").insert({ match_id: matchId, author_id: memberId, body: text });
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/attend`);
  return { ok: true };
}

export async function deleteAttendComment(matchId: string, commentId: string) {
  if (!matchId || !commentId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("attend_comments").delete().eq("id", commentId).eq("match_id", matchId); // RLS: 본인 또는 운영진
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/attend`);
  return { ok: true };
}
