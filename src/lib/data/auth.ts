import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// cache(): 한 요청(레이아웃+페이지 등) 안에서 중복 호출돼도 실제 조회는 1회만
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// 로그인 사용자의 profile + 연결된 member(로스터). member_id가 없으면 승인 대기.
export const getMyProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, kakao_nickname, claimed_name, claimed_position1, claimed_position2, claimed_num_red, claimed_num_blue, signup_rejected_at, member_id, members(*)")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

// 현재 사용자가 운영진(manager/admin)인지
export const isManager = cache(async () => {
  const profile = await getMyProfile();
  const role = (profile?.members as { role?: string } | null)?.role;
  return role === "manager" || role === "admin";
});

// 현재 사용자가 관리자(admin)인지
export const isAdmin = cache(async () => {
  const profile = await getMyProfile();
  const role = (profile?.members as { role?: string } | null)?.role;
  return role === "admin";
});
