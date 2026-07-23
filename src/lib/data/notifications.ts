import { createClient } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/notification-events";

export type Notif = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  url: string;
};

export async function getNotifications(): Promise<Notif[]> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notification_events")
    .select("id, kind, title, body, created_at, url")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getNotifications", error);
    return [];
  }

  return (data ?? []).map((event) => ({
    id: event.id as string,
    kind: event.kind as NotificationKind,
    title: event.title as string,
    body: event.body as string,
    at: event.created_at as string,
    url: event.url as string,
  }));
}
