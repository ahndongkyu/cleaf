"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/data/auth";
import { boundedText } from "@/lib/validation";

export async function addManagerTitle(label: string) {
  if (!(await isAdmin())) return { ok: false, message: "직책 관리 권한이 없어요" };
  const l = boundedText(label, 30);
  if (!l) return { ok: false, message: "직책명을 다시 확인해 주세요" };
  const supabase = await createClient();
  const { error } = await supabase.from("manager_titles").insert({ label: l });
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "이미 등록된 직책이에요" : "직책을 추가하지 못했어요",
    };
  }
  revalidatePath("/admin/managers");
  return { ok: true, message: "직책이 추가됐어요" };
}

export async function removeManagerTitle(id: string) {
  if (!(await isAdmin())) return { ok: false, message: "직책 관리 권한이 없어요" };
  if (!id) return { ok: false, message: "삭제할 직책을 찾을 수 없어요" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_manager_title", { requested_title_id: id });
  if (error || !data) return { ok: false, message: "직책을 삭제하지 못했어요" };
  revalidatePath("/admin/managers");
  revalidatePath("/members");
  return { ok: true, message: "직책이 삭제됐어요" };
}

export async function setMemberTitle(memberId: string, title: string | null) {
  if (!(await isAdmin())) return { ok: false, message: "직책 관리 권한이 없어요" };
  const normalizedTitle = title ? boundedText(title, 30) : null;
  if (!memberId || (title && !normalizedTitle)) return { ok: false, message: "직책 정보를 다시 확인해 주세요" };
  const supabase = await createClient();
  if (normalizedTitle) {
    const { data: exists, error: lookupError } = await supabase
      .from("manager_titles")
      .select("id")
      .eq("label", normalizedTitle)
      .maybeSingle();
    if (lookupError || !exists) return { ok: false, message: "등록되지 않은 직책이에요" };
  }
  const { error } = await supabase.from("members").update({ title: normalizedTitle }).eq("id", memberId);
  if (error) return { ok: false, message: "직책을 변경하지 못했어요" };
  revalidatePath("/admin/managers");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return { ok: true, message: "직책이 변경됐어요" };
}
