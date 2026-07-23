"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isManager, getMyProfile } from "@/lib/data/auth";
import { UNIFORM_NAMES } from "@/lib/uniforms";

// 회원 등록 (운영진 전용 — RLS의 is_manager()로 강제)
export async function createMember(formData: FormData) {
  if (!(await isManager())) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const position1 = String(formData.get("position1") ?? "MF");
  const position2 = String(formData.get("position2") ?? "");
  const role = String(formData.get("role") ?? "member");

  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      name,
      position1,
      position2: position2 || null,
      role,
    })
    .select("id")
    .single();

  if (error || !member) {
    console.error("createMember", error);
    return;
  }

  // 유니폼별 등번호
  const numbers: { member_id: string; uniform: string; number: number }[] = [];
  for (const uniform of UNIFORM_NAMES) {
    const raw = String(formData.get(`number_${uniform}`) ?? "").trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) numbers.push({ member_id: member.id, uniform, number: n });
    }
  }
  if (numbers.length) {
    await supabase.from("member_numbers").insert(numbers);
  }

  revalidatePath("/members");
  redirect(`/members?toast=${encodeURIComponent(`${name} 회원이 등록됐어요`)}`);
}

// 회원 수정 — 운영진은 전원, 회원은 본인만. 권한(role)은 운영진만 변경 가능(트리거로도 강제).
export async function updateMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const [manager, me] = await Promise.all([isManager(), getMyProfile()]);
  const mine = ((me?.member_id as string | null) ?? null) === id;
  if (!manager && !mine) return;

  const supabase = await createClient();
  const patch: Record<string, string | null> = {
    name,
    position1: String(formData.get("position1") ?? "MF"),
    position2: String(formData.get("position2") ?? "") || null,
  };
  if (manager) patch.role = String(formData.get("role") ?? "member"); // 권한은 운영진만
  await supabase.from("members").update(patch).eq("id", id);

  // 등번호 교체 (기존 삭제 후 재삽입)
  await supabase.from("member_numbers").delete().eq("member_id", id);
  const numbers: { member_id: string; uniform: string; number: number }[] = [];
  for (const uniform of UNIFORM_NAMES) {
    const raw = String(formData.get(`number_${uniform}`) ?? "").trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) numbers.push({ member_id: id, uniform, number: n });
    }
  }
  if (numbers.length) await supabase.from("member_numbers").insert(numbers);

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}?toast=${encodeURIComponent("수정됐어요")}`);
}

// 회원 삭제 (운영진)
export async function deleteMember(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("members").delete().eq("id", id);
  revalidatePath("/members");
  redirect(`/members?toast=${encodeURIComponent("회원이 삭제됐어요")}`);
}
