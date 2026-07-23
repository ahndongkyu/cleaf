import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// 카카오 직접 로그인 시작: state 발급 후 카카오 authorize로 리다이렉트.
// scope=openid 만 요청 → 이메일(account_email) 안 건드림 (비즈앱 불필요).
// prompt: 기본 select_account(계정 선택 화면 → 다른 카카오계정으로 전환 가능).
//   ?prompt=login 이면 재로그인 강제, ?prompt=none 이면 자동 SSO(계정선택 없음).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const state = crypto.randomUUID();

  const requested = url.searchParams.get("prompt");
  const prompt = requested === "login" || requested === "none" ? requested : "select_account";

  const cookieStore = await cookies();
  cookieStore.set("kakao_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: `${origin}/auth/kakao/callback`,
    response_type: "code",
    scope: "openid",
    prompt,
    state,
  });

  return NextResponse.redirect(`https://kauth.kakao.com/oauth/authorize?${params}`);
}
