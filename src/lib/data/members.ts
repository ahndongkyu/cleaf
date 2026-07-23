import { createClient } from "@/lib/supabase/server";
import type { Position, Role } from "@/lib/mock";

export type MemberRow = {
  id: string;
  name: string;
  nickname: string | null;
  position1: Position;
  position2: string | null; // 상세 포지션 (WF/CF/CAM/CM/CDM/SB/CB) 또는 null
  role: Role;
  title: string | null; // 운영진 세부 직책 (감독/총무/주장 등)
  member_numbers: { uniform: string; number: number }[];
};

export async function getMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, nickname, position1, position2, role, title, member_numbers(uniform, number)")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.error("getMembers", error);
    return [];
  }
  return (data ?? []) as MemberRow[];
}

export async function getMemberById(id: string): Promise<MemberRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, name, nickname, position1, position2, role, title, member_numbers(uniform, number)")
    .eq("id", id)
    .maybeSingle();
  return (data as MemberRow) ?? null;
}

export async function getMemberKakaoLink(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("member_id", memberId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
