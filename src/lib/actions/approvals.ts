"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToManagers } from "@/lib/push";

const toNum = (v: FormDataEntryValue | null): number | null => {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isNaN(n) ? null : n;
};
const normalizeName = (value: string) => value.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase("ko");

// 가입 대기자가 신청 정보 제출 (이름·포지션·등번호) → 승인 시 매칭 또는 신규 등록에 사용
export async function submitClaimName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const position1 = String(formData.get("position1") ?? "").trim();
  const position2 = String(formData.get("position2") ?? "").trim();
  const numRed = toNum(formData.get("num_red"));
  const numBlue = toNum(formData.get("num_blue"));
  const validMain = ["FW", "MF", "DF", "GK"];
  const validDetail: Record<string, string[]> = {
    FW: ["WF", "CF"],
    MF: ["CAM", "CM", "CDM"],
    DF: ["SB", "CB"],
    GK: [],
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (
    !user ||
    !name ||
    name.length > 40 ||
    !validMain.includes(position1) ||
    (validDetail[position1].length > 0 && !validDetail[position1].includes(position2)) ||
    numRed === null ||
    numBlue === null ||
    numRed < 0 ||
    numRed > 99 ||
    numBlue < 0 ||
    numBlue > 99
  ) return;
  const { error: profileError } = await supabase.from("profiles").update({
    claimed_name: name,
    claimed_position1: position1,
    claimed_position2: position2 || null,
    claimed_num_red: numRed,
    claimed_num_blue: numBlue,
    signup_rejected_at: null,
  }).eq("id", user.id);
  if (profileError) return;
  const { data: shouldNotify, error: notificationError } = await supabase.rpc("record_signup_notification");
  if (notificationError) return;
  // 운영진·관리자에게 가입 신청 알림 푸시
  if (shouldNotify) {
    await sendPushToManagers({
      title: "CLEAR FC · 새 가입 신청",
      body: `${name} 님이 승인을 기다리고 있어요`,
      url: "/admin/approvals",
    });
  }
  revalidatePath("/pending");
  revalidatePath("/admin/approvals");
  revalidatePath("/notifications");
  revalidatePath("/");
}

// 승인(신규): 신청 정보로 새 회원 생성 + 계정 연결
export async function createMemberFromSignup(profileId: string) {
  if (!(await isManager()) || !profileId) return { ok: false };
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("claimed_name, claimed_position1, claimed_position2, claimed_num_red, claimed_num_blue")
    .eq("id", profileId)
    .single();
  const prof = p as {
    claimed_name?: string | null;
    claimed_position1?: string | null;
    claimed_position2?: string | null;
    claimed_num_red?: number | null;
    claimed_num_blue?: number | null;
  } | null;
  if (
    !prof?.claimed_name ||
    !prof.claimed_position1 ||
    (prof.claimed_position1 !== "GK" && !prof.claimed_position2) ||
    prof.claimed_num_red == null ||
    prof.claimed_num_blue == null
  ) return { ok: false };

  const [{ data: allMembers }, { data: linkedProfiles }] = await Promise.all([
    supabase.from("members").select("id, name"),
    supabase.from("profiles").select("member_id").not("member_id", "is", null),
  ]);
  const linkedIds = new Set((linkedProfiles ?? []).map((row) => row.member_id as string));
  const sameName = (allMembers ?? []).filter(
    (row) => !linkedIds.has(row.id) && normalizeName(row.name) === normalizeName(prof.claimed_name!),
  );
  if (sameName.length === 1) {
    const { data, error } = await supabase.rpc("link_signup_profile", {
      requested_profile_id: profileId,
      requested_member_id: sameName[0].id,
    });
    if (error || !data) return { ok: false };
    revalidatePath("/admin/approvals");
    revalidatePath("/members");
    revalidatePath("/more");
    return { ok: true };
  }
  if (sameName.length > 1) return { ok: false };

  const { data: memberId, error } = await supabase.rpc("create_member_from_signup", {
    requested_profile_id: profileId,
  });
  if (error || !memberId) return { ok: false };
  revalidatePath("/admin/approvals");
  revalidatePath("/members");
  revalidatePath("/more");
  return { ok: true };
}

// 승인: 대기 프로필을 로스터 회원과 연결
export async function linkProfile(profileId: string, memberId: string) {
  if (!(await isManager()) || !profileId || !memberId) return { ok: false };

  const supabase = await createClient();
  const [{ data: profile }, { data: member }, { data: linked }] = await Promise.all([
    supabase.from("profiles").select("id, claimed_name").eq("id", profileId).is("member_id", null).maybeSingle(),
    supabase.from("members").select("id, name").eq("id", memberId).maybeSingle(),
    supabase.from("profiles").select("id").eq("member_id", memberId).limit(1),
  ]);
  if (
    !profile ||
    !profile.claimed_name ||
    !member ||
    linked?.length ||
    normalizeName(profile.claimed_name) !== normalizeName(member.name)
  ) return { ok: false };

  const { data, error } = await supabase.rpc("link_signup_profile", {
    requested_profile_id: profileId,
    requested_member_id: memberId,
  });
  if (error || !data) return { ok: false };

  revalidatePath("/admin/approvals");
  revalidatePath("/more");
  return { ok: true };
}

export async function rejectSignup(profileId: string) {
  if (!(await isManager()) || !profileId) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ signup_rejected_at: new Date().toISOString() })
    .eq("id", profileId)
    .is("member_id", null);
  if (error) return { ok: false };

  revalidatePath("/admin/approvals");
  revalidatePath("/more");
  return { ok: true };
}
