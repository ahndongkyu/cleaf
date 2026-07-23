import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// 카카오 콜백: code → id_token 교환 → Supabase signInWithIdToken으로 세션 생성.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("kakao_oauth_state")?.value;
  cookieStore.delete("kakao_oauth_state");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${origin}/login?error=state`);
  }

  // 1) code → 카카오 토큰 (id_token 포함)
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/kakao/callback`,
      code,
    }),
  });
  const token = await tokenRes.json();

  if (!token.id_token) {
    console.error("kakao token error", token);
    return NextResponse.redirect(`${origin}/login?error=token`);
  }

  // 2) id_token → Supabase 세션
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "kakao",
    token: token.id_token,
  });

  if (error) {
    console.error("supabase signInWithIdToken error", error);
    return NextResponse.redirect(`${origin}/login?error=session`);
  }

  return NextResponse.redirect(`${origin}/`);
}
