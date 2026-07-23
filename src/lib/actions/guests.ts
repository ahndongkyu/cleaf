"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

export async function addGuest(matchId: string, name: string, position1: string) {
  if (!(await isManager())) return;
  const n = name.trim();
  if (!n) return;
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type").eq("id", matchId).maybeSingle();
  await supabase.from("guests").insert({
    match_id: matchId,
    name: n,
    position1: position1 || "MF",
    team_side: match?.type === "self" ? "red" : null,
  });
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
}

export async function deleteGuest(matchId: string, guestId: string) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", guestId);
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
}

export async function setGuestTeamSide(matchId: string, guestId: string, teamSide: "red" | "sky" | null) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type, status").eq("id", matchId).maybeSingle();
  if (match?.type !== "self" || match.status === "cancelled") return;
  await supabase.from("guests").update({ team_side: teamSide }).eq("id", guestId).eq("match_id", matchId);
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/formation`);
}
