"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToMembers } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";

function revalidateMatch(matchId: string) {
  revalidatePath(`/admin/matches/${matchId}/result`);
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath("/matches");
  revalidatePath("/");
  revalidatePath("/stats");
}

// 최종 스코어 저장
export async function saveScore(matchId: string, scoreFor: number, scoreAgainst: number) {
  if (
    !(await isManager()) ||
    !matchId ||
    !Number.isInteger(scoreFor) ||
    !Number.isInteger(scoreAgainst) ||
    scoreFor < 0 ||
    scoreFor > 99 ||
    scoreAgainst < 0 ||
    scoreAgainst > 99
  ) return { ok: false };
  const supabase = await createClient();

  const [{ data: match }, { data: attendances }] = await Promise.all([
    supabase.from("matches").select("opponent, type, status").eq("id", matchId).single(),
    supabase.from("attendances").select("member_id").eq("match_id", matchId).eq("status", "going"),
  ]);
  if (!match || match.status === "cancelled") return { ok: false };
  const { data: saved, error } = await supabase.rpc("finalize_match_result", {
    requested_match_id: matchId,
    requested_score_for: scoreFor,
    requested_score_against: scoreAgainst,
  });
  if (error || !saved) return { ok: false };

  const memberIds = (attendances ?? []).map((attendance) => attendance.member_id as string).filter(Boolean);
  const label = match?.type === "self" ? match.opponent : `vs ${match?.opponent ?? ""}`;
  const body = `${scoreFor} : ${scoreAgainst} · MOM 투표에 참여해주세요`;
  await recordNotificationEvent(supabase, {
    kind: "result",
    referenceId: matchId,
    title: `${label} 경기 결과`,
    body,
    url: `/matches/${matchId}`,
    audience: "members",
    memberIds,
  });

  try {
    await sendPushToMembers(memberIds, {
      title: "경기 결과",
      body: `${label} ${body}`,
      url: `/matches/${matchId}`,
    });
  } catch {
    /* 푸시 실패 무시 */
  }

  revalidatePath("/notifications");
  revalidateMatch(matchId);
  return { ok: true };
}

type GoalTeamSide = "red" | "sky" | null;

function parseActor(value: string | null) {
  if (!value) return null;
  const separator = value.indexOf(":");
  if (separator < 0) return { kind: "member" as const, id: value };
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!id || (kind !== "member" && kind !== "guest")) return null;
  return { kind: kind as "member" | "guest", id };
}

async function actorCanRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  actorValue: string | null,
  teamSide: GoalTeamSide,
) {
  const actor = parseActor(actorValue);
  if (!actor) return null;
  if (actor.kind === "member") {
    let query = supabase
      .from("attendances")
      .select("member_id")
      .eq("match_id", matchId)
      .eq("member_id", actor.id)
      .eq("status", "going");
    if (teamSide) query = query.eq("team_side", teamSide);
    const { data } = await query.maybeSingle();
    return data ? actor : null;
  }
  let query = supabase
    .from("guests")
    .select("id")
    .eq("match_id", matchId)
    .eq("id", actor.id);
  if (teamSide) query = query.eq("team_side", teamSide);
  const { data } = await query.maybeSingle();
  return data ? actor : null;
}

// 득점 추가. 자체전은 득점 팀과 같은 팀의 참석자·용병만 기록할 수 있다.
export async function addGoal(
  matchId: string,
  scorerValue: string | null,
  assistValue: string | null,
  isOwnGoal = false,
  teamSide: GoalTeamSide = null,
) {
  if (!(await isManager())) return { ok: false };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status, type").eq("id", matchId).maybeSingle();
  if (!match || match.status === "cancelled") return { ok: false };
  if (match.type === "self" && teamSide !== "red" && teamSide !== "sky") return { ok: false };
  const scopedTeamSide = match.type === "self" ? teamSide : null;
  const scorer = isOwnGoal ? null : await actorCanRecord(supabase, matchId, scorerValue, scopedTeamSide);
  if (!isOwnGoal && !scorer) return { ok: false };
  const assist = isOwnGoal || !assistValue ? null : await actorCanRecord(supabase, matchId, assistValue, scopedTeamSide);
  if (assistValue && !isOwnGoal && !assist) return { ok: false };
  if (scorer && assist && scorer.kind === assist.kind && scorer.id === assist.id) return { ok: false };

  const { error } = await supabase.from("goals").insert({
    match_id: matchId,
    scorer_id: scorer?.kind === "member" ? scorer.id : null,
    assist_id: assist?.kind === "member" ? assist.id : null,
    scorer_guest_id: scorer?.kind === "guest" ? scorer.id : null,
    assist_guest_id: assist?.kind === "guest" ? assist.id : null,
    team_side: scopedTeamSide,
    is_own_goal: isOwnGoal,
  });
  if (error) return { ok: false };
  revalidateMatch(matchId);
  return { ok: true };
}

// 득점 삭제
export async function deleteGoal(formData: FormData) {
  if (!(await isManager())) throw new Error("득점 기록 삭제 권한이 없습니다.");
  const goalId = String(formData.get("goalId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  if (!goalId || !matchId) throw new Error("삭제할 득점 기록을 찾을 수 없습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("match_id", matchId);
  if (error) throw new Error("득점 기록을 삭제하지 못했습니다.");
  revalidateMatch(matchId);
}
