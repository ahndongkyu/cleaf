"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/data/auth";

export async function addManagerTitle(label: string) {
  if (!(await isAdmin())) return;
  const l = label.trim();
  if (!l) return;
  const supabase = await createClient();
  await supabase.from("manager_titles").insert({ label: l });
  revalidatePath("/admin/managers");
}

export async function removeManagerTitle(id: string) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  const { data: t } = await supabase.from("manager_titles").select("label").eq("id", id).maybeSingle();
  await supabase.from("manager_titles").delete().eq("id", id);
  if (t?.label) await supabase.from("members").update({ title: null }).eq("title", t.label);
  revalidatePath("/admin/managers");
  revalidatePath("/members");
}

export async function setMemberTitle(memberId: string, title: string | null) {
  if (!(await isAdmin())) return;
  const supabase = await createClient();
  await supabase.from("members").update({ title: title || null }).eq("id", memberId);
  revalidatePath("/admin/managers");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
}
