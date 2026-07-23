"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";

// 매치 등록 (운영진 — RLS의 is_manager()로 강제)
export async function createMatch(formData: FormData) {
  if (!(await isManager())) return;
  const matchType = String(formData.get("type") ?? "match");
  const opponent = matchType === "self" ? "레드 vs 블루" : String(formData.get("opponent") ?? "").trim();
  const match_date = String(formData.get("match_date") ?? "").trim();
  if (!opponent || !match_date) return;

  const supabase = await createClient();
  const matchTime = String(formData.get("match_time") ?? "");
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      opponent,
      match_date,
      match_time: matchTime || null,
      place: String(formData.get("place") ?? "") || null,
      place_address: String(formData.get("place_address") ?? "") || null,
      place_lat: formData.get("place_lat") ? Number(formData.get("place_lat")) : null,
      place_lng: formData.get("place_lng") ? Number(formData.get("place_lng")) : null,
      type: matchType,
      uniform: matchType === "self" ? null : String(formData.get("uniform") ?? "") || null,
      youtube_url: String(formData.get("youtube_url") ?? "") || null,
      status: "upcoming",
    })
    .select("id")
    .single();

  if (error || !match) {
    console.error("createMatch", error);
    return;
  }

  const label = matchType === "self" ? opponent : `vs ${opponent}`;
  const body = `${match_date}${matchTime ? ` · ${matchTime}` : ""} · 참석 여부를 알려주세요`;
  await recordNotificationEvent(supabase, {
    kind: "match",
    referenceId: match.id,
    title: `${label} 경기가 등록됐어요`,
    body,
    url: `/matches/${match.id}`,
    audience: "all",
  });

  try {
    await sendPushToAll({ title: "새 경기 등록", body: `${label} · ${body}`, url: `/matches/${match.id}` });
  } catch {
    /* 푸시 실패 무시 */
  }

  revalidatePath("/matches");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/matches?toast=${encodeURIComponent("경기가 등록됐어요")}`);
}

// 매치 수정 (운영진)
export async function updateMatch(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  const matchType = String(formData.get("type") ?? "match");
  const opponent = matchType === "self" ? "레드 vs 블루" : String(formData.get("opponent") ?? "").trim();
  const match_date = String(formData.get("match_date") ?? "").trim();
  if (!id || !opponent || !match_date) return;

  const supabase = await createClient();
  await supabase
    .from("matches")
    .update({
      opponent,
      match_date,
      match_time: String(formData.get("match_time") ?? "") || null,
      place: String(formData.get("place") ?? "") || null,
      place_address: String(formData.get("place_address") ?? "") || null,
      place_lat: formData.get("place_lat") ? Number(formData.get("place_lat")) : null,
      place_lng: formData.get("place_lng") ? Number(formData.get("place_lng")) : null,
      type: matchType,
      uniform: matchType === "self" ? null : String(formData.get("uniform") ?? "") || null,
      youtube_url: String(formData.get("youtube_url") ?? "") || null,
    })
    .eq("id", id);

  revalidatePath(`/matches/${id}`);
  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${id}?toast=${encodeURIComponent("경기 정보가 수정됐어요")}`);
}

// 경기 취소 (운영진) — 일정은 남기고 점수·참여 기록 집계에서는 제외한다.
export async function cancelMatch(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  const reasonType = String(formData.get("reason_type") ?? "");
  const detail = String(formData.get("cancel_reason") ?? "").trim();
  const allowedReasons = ["우천 취소", "인원 부족", "상대팀 사정", "기타"];
  if (!id || !allowedReasons.includes(reasonType) || (reasonType === "기타" && !detail)) return;

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("opponent, type, score_for, status")
    .eq("id", id)
    .maybeSingle();

  // 이미 결과가 입력된 경기는 취소 처리하지 않는다.
  if (!match || match.score_for !== null || match.status === "cancelled") return;

  const cancelReason = detail || reasonType;
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled", cancel_reason: cancelReason, mvp_member_id: null, mom_vote_close: null })
    .eq("id", id);
  if (error) return;

  // 기존 등록/리마인드 알림은 취소 알림으로 대체한다.
  await supabase.from("notification_events").delete().eq("reference_id", id);
  const label = match.type === "self" ? match.opponent : `vs ${match.opponent}`;
  await recordNotificationEvent(supabase, {
    kind: "cancelled",
    referenceId: id,
    title: `${label} 경기가 취소됐어요`,
    body: cancelReason,
    url: `/matches/${id}`,
    audience: "all",
  });
  try {
    await sendPushToAll({ title: "경기 취소", body: `${label} · ${cancelReason}`, url: `/matches/${id}` });
  } catch {
    /* 푸시 실패 무시 */
  }

  revalidatePath(`/matches/${id}`);
  revalidatePath("/matches");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/matches/${id}?toast=${encodeURIComponent("경기가 취소 처리됐어요")}`);
}

// 매치 삭제 (운영진)
export async function deleteMatch(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", id);
  await supabase.from("notification_events").delete().eq("reference_id", id);
  revalidatePath("/matches");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/matches?toast=${encodeURIComponent("경기가 삭제됐어요")}`);
}

// 참석 RSVP (본인) — attendances upsert
export async function setAttendance(matchId: string, status: "going" | "notGoing" | "undecided") {
  const profile = await getMyProfile();
  if (!profile?.member_id) return;

  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (match?.status === "cancelled") return;
  await supabase
    .from("attendances")
    .upsert(
      { match_id: matchId, member_id: profile.member_id, status, source: "self" },
      { onConflict: "match_id,member_id" },
    );

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
}

// 운영진 대리 참석 체크 (특정 회원) — RLS의 is_manager()로 강제
export async function setAttendanceFor(
  matchId: string,
  memberId: string,
  status: "going" | "notGoing" | "undecided",
) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (match?.status === "cancelled") return;
  await supabase
    .from("attendances")
    .upsert(
      { match_id: matchId, member_id: memberId, status, source: "manager" },
      { onConflict: "match_id,member_id" },
    );
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}

export async function setAttendanceTeamSide(
  matchId: string,
  memberId: string,
  teamSide: "red" | "sky" | null,
) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type, status").eq("id", matchId).maybeSingle();
  if (match?.type !== "self" || match.status === "cancelled") return;
  await supabase
    .from("attendances")
    .update({ team_side: teamSide })
    .eq("match_id", matchId)
    .eq("member_id", memberId)
    .eq("status", "going");
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}
