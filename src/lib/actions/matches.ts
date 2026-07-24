"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";
import {
  boundedText,
  isIsoDate,
  isOneOf,
  isTime,
  LIMITS,
  optionalBoundedText,
  optionalCoordinate,
  optionalHttpsUrl,
} from "@/lib/validation";

const MATCH_TYPES = ["match", "self"] as const;
const ATTENDANCE_STATUSES = ["going", "notGoing", "undecided"] as const;

function matchValues(formData: FormData) {
  const typeValue = String(formData.get("type") ?? "match");
  const matchType = isOneOf(typeValue, MATCH_TYPES) ? typeValue : null;
  const opponent = matchType === "self"
    ? "레드 vs 블루"
    : boundedText(formData.get("opponent"), LIMITS.shortText);
  const matchDate = String(formData.get("match_date") ?? "").trim();
  const matchTime = String(formData.get("match_time") ?? "").trim();
  const place = optionalBoundedText(formData.get("place"), LIMITS.shortText);
  const placeAddress = optionalBoundedText(formData.get("place_address"), 200);
  const placeLat = optionalCoordinate(formData.get("place_lat"), -90, 90);
  const placeLng = optionalCoordinate(formData.get("place_lng"), -180, 180);
  const youtubeUrl = optionalHttpsUrl(formData.get("youtube_url"));
  const uniform = matchType === "self" ? null : optionalBoundedText(formData.get("uniform"), 30);
  if (
    !matchType ||
    !opponent ||
    !isIsoDate(matchDate) ||
    (matchTime && !isTime(matchTime)) ||
    place === undefined ||
    placeAddress === undefined ||
    placeLat === undefined ||
    placeLng === undefined ||
    youtubeUrl === undefined ||
    uniform === undefined
  ) return null;
  return {
    opponent,
    match_date: matchDate,
    match_time: matchTime || null,
    place,
    place_address: placeAddress,
    place_lat: placeLat,
    place_lng: placeLng,
    type: matchType,
    uniform,
    youtube_url: youtubeUrl,
  };
}

// 매치 등록 (운영진 — RLS의 is_manager()로 강제)
export async function createMatch(formData: FormData) {
  if (!(await isManager())) throw new Error("경기 등록 권한이 없습니다.");
  const values = matchValues(formData);
  if (!values) throw new Error("경기 입력값을 다시 확인해 주세요.");

  const supabase = await createClient();
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      ...values,
      status: "upcoming",
    })
    .select("id")
    .single();

  if (error || !match) {
    throw new Error("경기를 등록하지 못했습니다.");
  }

  const label = values.type === "self" ? values.opponent : `vs ${values.opponent}`;
  const body = `${values.match_date}${values.match_time ? ` · ${values.match_time}` : ""} · 참석 여부를 알려주세요`;
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
  if (!(await isManager())) throw new Error("경기 수정 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  const values = matchValues(formData);
  if (!id || !values) throw new Error("경기 입력값을 다시 확인해 주세요.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update(values)
    .eq("id", id);
  if (error) throw new Error("경기 정보를 수정하지 못했습니다.");

  revalidatePath(`/matches/${id}`);
  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${id}?toast=${encodeURIComponent("경기 정보가 수정됐어요")}`);
}

// 경기 취소 (운영진) — 일정은 남기고 점수·참여 기록 집계에서는 제외한다.
export async function cancelMatch(formData: FormData) {
  if (!(await isManager())) throw new Error("경기 삭제 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  const reasonType = String(formData.get("reason_type") ?? "");
  const detailValue = String(formData.get("cancel_reason") ?? "").trim();
  const detail = detailValue ? boundedText(detailValue, LIMITS.matchComment) : null;
  const allowedReasons = ["우천 취소", "인원 부족", "상대팀 사정", "기타"];
  if (
    !id ||
    !allowedReasons.includes(reasonType) ||
    (detailValue && !detail) ||
    (reasonType === "기타" && !detail)
  ) throw new Error("취소 사유를 다시 확인해 주세요.");

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("opponent, type, score_for, status")
    .eq("id", id)
    .maybeSingle();

  // 이미 결과가 입력된 경기는 취소 처리하지 않는다.
  if (matchError || !match) throw new Error("경기 정보를 확인하지 못했습니다.");
  if (match.score_for !== null || match.status === "cancelled") {
    throw new Error("이미 종료되었거나 취소된 경기입니다.");
  }

  const cancelReason = detail || reasonType;
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled", cancel_reason: cancelReason, mvp_member_id: null, mom_vote_close: null })
    .eq("id", id);
  if (error) throw new Error("경기를 취소하지 못했습니다.");

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
  if (!(await isManager())) throw new Error("경기 삭제 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("삭제할 경기를 찾을 수 없습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw new Error("경기를 삭제하지 못했습니다.");
  await supabase.from("notification_events").delete().eq("reference_id", id);
  revalidatePath("/matches");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/matches?toast=${encodeURIComponent("경기가 삭제됐어요")}`);
}

// 참석 RSVP (본인) — attendances upsert
export async function setAttendance(matchId: string, status: "going" | "notGoing" | "undecided") {
  const profile = await getMyProfile();
  if (!profile?.member_id || !matchId || !isOneOf(status, ATTENDANCE_STATUSES)) return { ok: false };

  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (!match || match.status === "cancelled") return { ok: false };
  const { error } = await supabase
    .from("attendances")
    .upsert(
      { match_id: matchId, member_id: profile.member_id, status, source: "self" },
      { onConflict: "match_id,member_id" },
    );
  if (error) return { ok: false };

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  return { ok: true };
}

// 운영진 대리 참석 체크 (특정 회원) — RLS의 is_manager()로 강제
export async function setAttendanceFor(
  matchId: string,
  memberId: string,
  status: "going" | "notGoing" | "undecided",
) {
  if (!(await isManager()) || !matchId || !memberId || !isOneOf(status, ATTENDANCE_STATUSES)) return { ok: false };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (!match || match.status === "cancelled") return { ok: false };
  const attendance = {
    match_id: matchId,
    member_id: memberId,
    status,
    source: "manager" as const,
    ...(status === "going" ? {} : { team_side: null }),
  };
  const { error } = await supabase
    .from("attendances")
    .upsert(
      attendance,
      { onConflict: "match_id,member_id" },
    );
  if (error) return { ok: false };
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  return { ok: true };
}

export type SelfMatchTeamAssignment = {
  kind: "member" | "guest";
  id: string;
  teamSide: "red" | "sky";
};

export async function assignSelfMatchTeams(
  matchId: string,
  assignments: SelfMatchTeamAssignment[],
) {
  if (
    !(await isManager()) ||
    !matchId ||
    !Array.isArray(assignments) ||
    assignments.length === 0 ||
    assignments.length > 200 ||
    assignments.some(
      (assignment) =>
        !assignment.id ||
        (assignment.kind !== "member" && assignment.kind !== "guest") ||
        (assignment.teamSide !== "red" && assignment.teamSide !== "sky"),
    )
  ) return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_self_match_teams", {
    requested_match_id: matchId,
    requested_assignments: assignments.map((assignment) => ({
      kind: assignment.kind,
      id: assignment.id,
      team_side: assignment.teamSide,
    })),
  });
  if (error || !data) return { ok: false };

  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function setAttendanceTeamSide(
  matchId: string,
  memberId: string,
  teamSide: "red" | "sky" | null,
) {
  if (!(await isManager()) || !matchId || !memberId) return { ok: false };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type, status").eq("id", matchId).maybeSingle();
  if (match?.type !== "self" || match.status === "cancelled") return { ok: false };
  const { error } = await supabase
    .from("attendances")
    .update({ team_side: teamSide })
    .eq("match_id", matchId)
    .eq("member_id", memberId)
    .eq("status", "going");
  if (error) return { ok: false };
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
  return { ok: true };
}
