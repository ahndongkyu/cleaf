import { createClient } from "@/lib/supabase/server";

export type PendingProfile = {
  id: string;
  kakao_nickname: string | null;
  claimed_name: string | null;
  claimed_position1: string | null;
  claimed_position2: string | null;
  claimed_num_red: number | null;
  claimed_num_blue: number | null;
  email: string | null;
  created_at: string;
};

// 승인 대기 (카카오 로그인했으나 member_id 미연결)
export async function getPendingProfiles(): Promise<PendingProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, kakao_nickname, claimed_name, claimed_position1, claimed_position2, claimed_num_red, claimed_num_blue, email, created_at")
    .is("member_id", null)
    .not("claimed_name", "is", null)
    .is("signup_rejected_at", null)
    .order("created_at");
  return (data ?? []) as PendingProfile[];
}

export async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("member_id", null)
    .not("claimed_name", "is", null)
    .is("signup_rejected_at", null);
  return count ?? 0;
}

// 이미 계정과 연결된 member id 집합 (중복 연결 방지용)
export async function getLinkedMemberIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("member_id").not("member_id", "is", null);
  return new Set((data ?? []).map((r) => r.member_id as string));
}
