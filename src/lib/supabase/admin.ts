import { createClient } from "@supabase/supabase-js";

// 서비스 롤(secret) 클라이언트 — 세션 없는 서버 작업(크론)용, RLS 우회.
// 절대 클라이언트로 노출 금지.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
