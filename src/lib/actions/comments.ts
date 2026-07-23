"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { boundedText, LIMITS } from "@/lib/validation";

async function myMemberId(): Promise<string | null> {
  const me = await getMyProfile();
  return (me?.member_id as string | null) ?? null;
}

// 운영진 코멘트(총평) 저장 — 경기당 1개 (upsert)
export async function saveMatchComment(matchId: string, body: string) {
  if (!(await isManager())) return { ok: false };
  const text = boundedText(body, LIMITS.matchComment);
  if (!matchId || !text) return { ok: false };
  const supabase = await createClient();
  const me = await myMemberId();
  const { error } = await supabase
    .from("match_comments")
    .upsert({ match_id: matchId, author_id: me, body: text, updated_at: new Date().toISOString() }, { onConflict: "match_id" });
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}

export async function deleteMatchComment(matchId: string) {
  if (!(await isManager()) || !matchId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("match_comments").delete().eq("match_id", matchId);
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}

// 회원 댓글/답글 작성
export async function addComment(matchId: string, body: string, parentId: string | null) {
  const text = boundedText(body, LIMITS.comment);
  if (!matchId || !text) return { ok: false };
  const me = await myMemberId();
  if (!me) return { ok: false };
  const supabase = await createClient();
  if (parentId) {
    const { data: parent } = await supabase.from("comments").select("match_id, parent_id").eq("id", parentId).maybeSingle();
    if (!parent || parent.match_id !== matchId || parent.parent_id) return { ok: false };
  }
  const { error } = await supabase.from("comments").insert({ match_id: matchId, author_id: me, parent_id: parentId, body: text });
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/comment`);
  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}

export async function deleteComment(matchId: string, commentId: string) {
  if (!matchId || !commentId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("match_id", matchId); // RLS: 본인 또는 운영진
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/comment`);
  return { ok: true };
}

// 좋아요 토글 (target: 'post' | 'comment')
export async function toggleLike(matchId: string, target: "post" | "comment", targetId: string) {
  const me = await myMemberId();
  if (!me || !matchId || !targetId || (target !== "post" && target !== "comment")) return { ok: false };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("target", target)
    .eq("target_id", targetId)
    .eq("member_id", me)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("comment_likes").delete().eq("id", existing.id);
    if (error) return { ok: false };
  } else {
    const { error } = await supabase.from("comment_likes").insert({ target, target_id: targetId, member_id: me });
    if (error) return { ok: false };
  }
  revalidatePath(`/matches/${matchId}/comment`);
  return { ok: true };
}
