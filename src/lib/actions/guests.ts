"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { boundedText, isOneOf, LIMITS } from "@/lib/validation";

const POSITIONS = ["FW", "MF", "DF", "GK"] as const;

export async function addGuest(matchId: string, name: string, position1: string) {
  if (!(await isManager())) return { ok: false };
  const n = boundedText(name, LIMITS.name);
  if (!matchId || !n || !isOneOf(position1, POSITIONS)) return { ok: false };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type").eq("id", matchId).maybeSingle();
  if (!match) return { ok: false };
  const { error } = await supabase.from("guests").insert({
    match_id: matchId,
    name: n,
    position1: position1 || "MF",
    team_side: match?.type === "self" ? "red" : null,
  });
  if (error) return { ok: false };
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
  return { ok: true };
}

export async function deleteGuest(matchId: string, guestId: string) {
  if (!(await isManager()) || !matchId || !guestId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("guests").delete().eq("id", guestId).eq("match_id", matchId);
  if (error) return { ok: false };
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
  return { ok: true };
}

export async function setGuestTeamSide(matchId: string, guestId: string, teamSide: "red" | "sky" | null) {
  if (!(await isManager()) || !matchId || !guestId) return { ok: false };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("type, status").eq("id", matchId).maybeSingle();
  if (match?.type !== "self" || match.status === "cancelled") return { ok: false };
  const { error } = await supabase.from("guests").update({ team_side: teamSide }).eq("id", guestId).eq("match_id", matchId);
  if (error) return { ok: false };
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}/formation`);
  return { ok: true };
}
