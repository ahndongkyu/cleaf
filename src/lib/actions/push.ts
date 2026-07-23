"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  if (!sub.endpoint.startsWith("https://") || !sub.p256dh || !sub.auth) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { profile_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
  return { ok: !error };
}

export async function removeSubscription(endpoint: string) {
  if (!endpoint.startsWith("https://")) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: !error };
}
