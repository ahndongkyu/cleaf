"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToMembers } from "@/lib/push";
import type { FormationLayout, FormationTeamSide } from "@/lib/data/formations";
import { recordNotificationEvent } from "@/lib/notification-events";

// 포메이션 저장 (운영진) — 매치당 1행으로 교체 저장
export async function saveFormation(
  matchId: string,
  layout: FormationLayout,
  teamSide: FormationTeamSide = "all",
) {
  if (
    !(await isManager()) ||
    !matchId ||
    !["all", "red", "sky"].includes(teamSide) ||
    !layout ||
    typeof layout !== "object"
  ) return { ok: false };
  try {
    if (JSON.stringify(layout).length > 200_000) return { ok: false };
  } catch {
    return { ok: false };
  }
  const supabase = await createClient();

  // 최초 등록 여부 (재저장/수정 시엔 푸시 안 보냄 — 스팸 방지)
  const { data: existing, error: existingError } = await supabase
    .from("formations")
    .select("id")
    .eq("match_id", matchId)
    .limit(1);
  if (existingError) return { ok: false };
  const isFirst = !existing || existing.length === 0;

  const { error } = await supabase
    .from("formations")
    .upsert(
      { match_id: matchId, team_side: teamSide, name: "custom", layout },
      { onConflict: "match_id,team_side" },
    );
  if (error) return { ok: false };
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath("/");

  if (isFirst) {
    const { data: att } = await supabase
      .from("attendances")
      .select("member_id")
      .eq("match_id", matchId)
      .eq("status", "going");
    const memberIds = (att ?? []).map((a) => a.member_id as string).filter(Boolean);
    await recordNotificationEvent(supabase, {
      kind: "lineup",
      referenceId: matchId,
      title: "라인업이 등록됐어요",
      body: "이번 경기 포메이션과 쿼터별 배치를 확인하세요",
      url: `/matches/${matchId}/formation`,
      audience: "members",
      memberIds,
    });
    try {
      await sendPushToMembers(memberIds, {
        title: "CLEAR FC · 라인업 등록",
        body: "이번 경기 포메이션이 등록됐어요. 라인업을 확인하세요!",
        url: `/matches/${matchId}/formation`,
      });
    } catch {
      /* 포메이션 저장은 유지하고 푸시 실패만 무시 */
    }
    revalidatePath("/notifications");
    revalidatePath("/");
  }
  return { ok: true };
}
