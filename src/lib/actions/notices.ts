"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";
import { noticePlainText, sanitizeNoticeContent } from "@/lib/notice-content";

export async function createNotice(formData: FormData) {
  if (!(await isManager())) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const content = sanitizeNoticeContent(String(formData.get("content") ?? ""));
  if (!noticePlainText(content)) return;
  const profile = await getMyProfile();

  const supabase = await createClient();
  const { data: notice, error } = await supabase
    .from("notices")
    .insert({
      title,
      content,
      author_id: (profile?.member_id as string | null) ?? null,
    })
    .select("id")
    .single();
  if (error || !notice) {
    console.error("createNotice", error);
    return;
  }

  await recordNotificationEvent(supabase, {
    kind: "notice",
    referenceId: notice.id,
    title,
    body: "새 공지가 등록됐어요",
    url: `/notices/${notice.id}`,
    audience: "all",
  });

  try {
    await sendPushToAll({ title: "새 공지", body: title, url: `/notices/${notice.id}` });
  } catch {
    /* 푸시 실패는 무시 */
  }

  revalidatePath("/notices");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/notices?toast=${encodeURIComponent("공지가 등록됐어요")}`);
}

export async function updateNotice(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = sanitizeNoticeContent(String(formData.get("content") ?? ""));
  if (!id || !title || !noticePlainText(content)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .update({ title, content })
    .eq("id", id);
  if (error) return;

  await supabase
    .from("notification_events")
    .update({ title })
    .eq("kind", "notice")
    .eq("reference_id", id);

  revalidatePath(`/notices/${id}`);
  revalidatePath("/notices");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/notices/${id}?toast=${encodeURIComponent("공지가 수정됐어요")}`);
}

export async function trackNoticeView(noticeId: string) {
  const profile = await getMyProfile();
  if (!profile?.member_id || !noticeId) return null;

  const supabase = await createClient();
  await supabase
    .from("notice_views")
    .upsert(
      { notice_id: noticeId, member_id: profile.member_id },
      { onConflict: "notice_id,member_id", ignoreDuplicates: true },
    );

  const { data } = await supabase
    .from("notices")
    .select("view_count")
    .eq("id", noticeId)
    .maybeSingle();

  revalidatePath("/notices");
  return typeof data?.view_count === "number" ? data.view_count : null;
}

export async function deleteNotice(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("notices").delete().eq("id", id);
  await supabase.from("notification_events").delete().eq("kind", "notice").eq("reference_id", id);
  revalidatePath("/notices");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/notices?toast=${encodeURIComponent("공지가 삭제됐어요")}`);
}
