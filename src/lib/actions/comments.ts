"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";

async function myMemberId(): Promise<string | null> {
  const me = await getMyProfile();
  return (me?.member_id as string | null) ?? null;
}

// 운영진 코멘트(총평) 저장 — 경기당 1개 (upsert)
export async function saveMatchComment(matchId: string, body: string) {
  if (!(await isManager())) return;
  const text = body.trim();
  if (!text) return;
  const supabase = await createClient();
  const me = await myMemberId();
  await supabase
    .from("match_comments")
    .upsert({ match_id: matchId, author_id: me, body: text, updated_at: new Date().toISOString() }, { onConflict: "match_id" });
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
}

export async function deleteMatchComment(matchId: string) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("match_comments").delete().eq("match_id", matchId);
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
}

// 회원 댓글/답글 작성
export async function addComment(matchId: string, body: string, parentId: string | null) {
  const text = body.trim();
  if (!text) return;
  const me = await myMemberId();
  if (!me) return;
  const supabase = await createClient();
  await supabase.from("comments").insert({ match_id: matchId, author_id: me, parent_id: parentId, body: text });
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
}

export async function deleteComment(matchId: string, commentId: string) {
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId); // RLS: 본인 또는 운영진
  revalidatePath(`/matches/${matchId}/comment`);
}

// 좋아요 토글 (target: 'post' | 'comment')
export async function toggleLike(matchId: string, target: "post" | "comment", targetId: string) {
  const me = await myMemberId();
  if (!me) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("target", target)
    .eq("target_id", targetId)
    .eq("member_id", me)
    .maybeSingle();
  if (existing) {
    await supabase.from("comment_likes").delete().eq("id", existing.id);
  } else {
    await supabase.from("comment_likes").insert({ target, target_id: targetId, member_id: me });
  }
  revalidatePath(`/matches/${matchId}/comment`);
}
