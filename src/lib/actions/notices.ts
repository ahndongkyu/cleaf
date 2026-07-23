"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";
import { noticePlainText, sanitizeNoticeContent } from "@/lib/notice-content";
import { boundedText, LIMITS } from "@/lib/validation";

function noticeValues(formData: FormData) {
  const title = boundedText(formData.get("title"), LIMITS.noticeTitle);
  const rawContent = String(formData.get("content") ?? "");
  if (!title || rawContent.length > LIMITS.noticeContent) return null;
  const content = sanitizeNoticeContent(rawContent);
  return noticePlainText(content) ? { title, content } : null;
}

export async function createNotice(formData: FormData) {
  if (!(await isManager())) throw new Error("공지 작성 권한이 없습니다.");
  const values = noticeValues(formData);
  if (!values) throw new Error("공지 입력값을 다시 확인해 주세요.");
  const { title, content } = values;
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
    throw new Error("공지를 등록하지 못했습니다.");
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
  if (!(await isManager())) throw new Error("공지 수정 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  const values = noticeValues(formData);
  if (!id || !values) throw new Error("공지 입력값을 다시 확인해 주세요.");
  const { title, content } = values;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .update({ title, content })
    .eq("id", id);
  if (error) throw new Error("공지를 수정하지 못했습니다.");

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
  if (!(await isManager())) throw new Error("공지 삭제 권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("삭제할 공지를 찾을 수 없습니다.");
  const supabase = await createClient();
  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) throw new Error("공지를 삭제하지 못했습니다.");
  await supabase.from("notification_events").delete().eq("kind", "notice").eq("reference_id", id);
  revalidatePath("/notices");
  revalidatePath("/notifications");
  revalidatePath("/");
  redirect(`/notices?toast=${encodeURIComponent("공지가 삭제됐어요")}`);
}
