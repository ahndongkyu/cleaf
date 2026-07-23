import { createClient } from "@/lib/supabase/server";

export type NoticeRow = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  view_count: number;
  members: { name: string } | null;
};

export async function getNotices(): Promise<NoticeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, content, created_at, view_count, members!notices_author_id_fkey(name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as NoticeRow[];
}

export async function getNotice(id: string): Promise<NoticeRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, content, created_at, view_count, members!notices_author_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as NoticeRow) ?? null;
}
