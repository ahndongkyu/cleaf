import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/lib/mock";

export type GuestRow = { id: string; name: string; position1: Position; team_side: "red" | "sky" | null };

export async function getGuests(matchId: string): Promise<GuestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, position1, team_side")
    .eq("match_id", matchId)
    .order("created_at");
  if (error) return []; // 테이블 미생성 등 — 안전하게 빈 배열
  return (data ?? []) as GuestRow[];
}
