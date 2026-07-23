import { createClient } from "@/lib/supabase/server";

export type FormationLayout = Record<
  string,
  {
    preset: string;
    assignments: { slot: number; memberId: string }[];
    substitutions?: {
      slot: number;
      outMemberId: string;
      inMemberId: string;
    }[];
    // 빈 쿼터를 의도적으로 저장했는지 구분해 다음 쿼터 자동 복사를 제어한다.
    initialized?: boolean;
  }
>;

export type FormationTeamSide = "all" | "red" | "sky";

export async function getFormation(
  matchId: string,
  teamSide?: FormationTeamSide,
): Promise<FormationLayout | null> {
  const supabase = await createClient();
  let query = supabase
    .from("formations")
    .select("layout")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (teamSide) query = query.eq("team_side", teamSide);
  const { data } = await query;
  return (data?.[0]?.layout as FormationLayout) ?? null;
}
