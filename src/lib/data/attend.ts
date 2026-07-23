import { createClient } from "@/lib/supabase/server";

export type AttendComment = {
  id: string;
  authorId: string;
  authorName: string;
  position1: string;
  isManagerAuthor: boolean;
  title: string | null;
  body: string;
  createdAt: string;
};

export async function getAttendComments(matchId: string): Promise<AttendComment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attend_comments")
    .select("id, author_id, body, created_at, members(name, position1, role, title)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => {
    const m = (r as { members?: { name?: string; position1?: string; role?: string; title?: string | null } }).members;
    return {
      id: r.id as string,
      authorId: r.author_id as string,
      authorName: m?.name ?? "회원",
      position1: m?.position1 ?? "MF",
      isManagerAuthor: m?.role === "manager",
      title: m?.title ?? null,
      body: r.body as string,
      createdAt: r.created_at as string,
    };
  });
}
