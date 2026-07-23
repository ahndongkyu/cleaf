import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;
function ensure() {
  if (!configured && PUBLIC && PRIVATE) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  }
  return configured;
}

// 구독 배열에 직접 발송 (크론 등 세션 없는 곳에서 admin 조회 후 사용)
export async function sendToSubscriptions(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body: string; url?: string },
) {
  if (!ensure()) return;
  const json = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, json);
      } catch {
        /* 개별 실패 무시 */
      }
    }),
  );
}

// 특정 회원들에게 푸시 발송 (운영진 세션 — RLS로 profiles/subscriptions 전체 조회)
export async function sendPushToMembers(
  memberIds: string[],
  payload: { title: string; body: string; url?: string },
) {
  if (!ensure() || memberIds.length === 0) return;
  const supabase = await createClient();
  const { data: profs } = await supabase.from("profiles").select("id").in("member_id", memberIds);
  const profileIds = (profs ?? []).map((p) => p.id as string);
  if (profileIds.length === 0) return;
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", profileIds);
  const json = JSON.stringify(payload);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          json,
        );
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
}

// 운영진/관리자에게만 푸시 발송.
// 신청자 등 비운영진 세션에서도 호출 가능하도록 security definer 함수(manager_push_subs)로 구독 조회.
export async function sendPushToManagers(payload: { title: string; body: string; url?: string }) {
  if (!ensure()) return;
  const supabase = await createClient();
  const { data } = await supabase.rpc("manager_push_subs");
  await sendToSubscriptions(
    (data ?? []) as { endpoint: string; p256dh: string; auth: string }[],
    payload,
  );
}

// 전체 구독자에게 푸시 발송 (운영진 세션에서 호출 — RLS로 전체 조회 허용)
export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!ensure()) return;
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  const json = JSON.stringify(payload);

  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          json,
        );
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
}
