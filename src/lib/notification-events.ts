import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationKind = "notice" | "match" | "reminder" | "lineup" | "result" | "approval" | "cancelled";
export type NotificationAudience = "all" | "managers" | "members";

export async function recordNotificationEvent(
  supabase: SupabaseClient,
  event: {
    kind: NotificationKind;
    referenceId: string;
    title: string;
    body: string;
    url: string;
    audience: NotificationAudience;
    memberIds?: string[];
  },
) {
  const { error } = await supabase.from("notification_events").upsert(
    {
      kind: event.kind,
      reference_id: event.referenceId,
      title: event.title,
      body: event.body,
      url: event.url,
      audience: event.audience,
      member_ids: event.memberIds ?? [],
      created_at: new Date().toISOString(),
    },
    { onConflict: "kind,reference_id" },
  );
  if (error) console.error("recordNotificationEvent", error);
}
