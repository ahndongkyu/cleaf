"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("push_subscriptions")
    .upsert(
      { profile_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
}

export async function removeSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
