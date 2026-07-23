"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isManager, getMyProfile } from "@/lib/data/auth";
import { UNIFORM_NAMES } from "@/lib/uniforms";
import { boundedText, isOneOf, LIMITS, uniformNumber } from "@/lib/validation";

const POSITIONS = ["FW", "MF", "DF", "GK"] as const;
const ROLES = ["member", "manager", "admin"] as const;
const DETAIL_POSITIONS: Record<string, readonly string[]> = {
  FW: ["WF", "CF"],
  MF: ["CAM", "CM", "CDM"],
  DF: ["SB", "CB"],
  GK: [],
};

function memberValues(formData: FormData) {
  const name = boundedText(formData.get("name"), LIMITS.name);
  const position1 = String(formData.get("position1") ?? "");
  const position2 = String(formData.get("position2") ?? "").trim();
  const role = String(formData.get("role") ?? "member");
  if (
    !name ||
    !isOneOf(position1, POSITIONS) ||
    !isOneOf(role, ROLES) ||
    (DETAIL_POSITIONS[position1].length > 0 && !DETAIL_POSITIONS[position1].includes(position2)) ||
    (position1 === "GK" && position2)
  ) return null;
  const numbers: { uniform: string; number: number }[] = [];
  for (const uniform of UNIFORM_NAMES) {
    const number = uniformNumber(formData.get(`number_${uniform}`));
    if (number === undefined) return null;
    if (number !== null) numbers.push({ uniform, number });
  }
  return { name, position1, position2, role, numbers };
}

// 회원 등록 (운영진 전용 — RLS의 is_manager()로 강제)
export async function createMember(formData: FormData) {
  if (!(await isManager())) throw new Error("회원 등록 권한이 없습니다.");
  const values = memberValues(formData);
  if (!values) throw new Error("회원 입력값을 다시 확인해 주세요.");

  const supabase = await createClient();
  const { data: memberId, error } = await supabase.rpc("save_member_record", {
    requested_member_id: null,
    requested_name: values.name,
    requested_position1: values.position1,
    requested_position2: values.position2,
    requested_role: values.role,
    requested_numbers: values.numbers,
  });
  if (error || !memberId) throw new Error("회원을 등록하지 못했습니다.");

  revalidatePath("/members");
  redirect(`/members?toast=${encodeURIComponent(`${values.name} 회원이 등록됐어요`)}`);
}

// 회원 수정 — 운영진은 전원, 회원은 본인만. 권한(role)은 운영진만 변경 가능(트리거로도 강제).
export async function updateMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const values = memberValues(formData);
  if (!id || !values) throw new Error("회원 입력값을 다시 확인해 주세요.");

  const [manager, me] = await Promise.all([isManager(), getMyProfile()]);
  const mine = ((me?.member_id as string | null) ?? null) === id;
  if (!manager && !mine) throw new Error("회원 수정 권한이 없습니다.");

  const supabase = await createClient();
  const { data: memberId, error } = await supabase.rpc("save_member_record", {
    requested_member_id: id,
    requested_name: values.name,
    requested_position1: values.position1,
    requested_position2: values.position2,
    requested_role: manager ? values.role : ((me?.members as { role?: string } | null)?.role ?? "member"),
    requested_numbers: values.numbers,
  });
  if (error || !memberId) throw new Error("회원 정보를 수정하지 못했습니다.");

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}?toast=${encodeURIComponent("수정됐어요")}`);
}

// 회원 삭제 (운영진)
export async function deleteMember(formData: FormData) {
  if (!(await isManager())) throw new Error("회원 삭제 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("삭제할 회원을 찾을 수 없습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error("회원을 삭제하지 못했습니다.");
  revalidatePath("/members");
  redirect(`/members?toast=${encodeURIComponent("회원이 삭제됐어요")}`);
}
