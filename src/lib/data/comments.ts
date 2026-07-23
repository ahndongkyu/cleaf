import { createClient } from "@/lib/supabase/server";

export type TalkPost = {
  id: string;
  body: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
};

export type TalkComment = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  position1: string;
  isManagerAuthor: boolean;
  title: string | null;
  likes: number;
  likedByMe: boolean;
  replies: TalkComment[];
};

export type MatchTalk = {
  post: TalkPost | null;
  comments: TalkComment[];
  commentCount: number;
};

type Row = {
  id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  author_id: string;
  members: { name: string; position1: string; role: string; title: string | null } | null;
};

export async function getMatchTalk(matchId: string, myMemberId: string | null): Promise<MatchTalk> {
  const supabase = await createClient();
  const [postRes, commentsRes] = await Promise.all([
    supabase.from("match_comments").select("id, body, created_at").eq("match_id", matchId).maybeSingle(),
    supabase
      .from("comments")
      .select("id, body, parent_id, created_at, author_id, members(name, position1, role, title)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
  ]);

  const postRow = postRes.data as { id: string; body: string; created_at: string } | null;
  const rows = (commentsRes.data ?? []) as unknown as Row[];

  // 좋아요 집계 (post + 모든 댓글)
  const ids: string[] = [];
  if (postRow) ids.push(postRow.id);
  for (const r of rows) ids.push(r.id);
  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  if (ids.length) {
    const { data: likes } = await supabase.from("comment_likes").select("target_id, member_id").in("target_id", ids);
    for (const l of likes ?? []) {
      likeCount.set(l.target_id as string, (likeCount.get(l.target_id as string) ?? 0) + 1);
      if (myMemberId && l.member_id === myMemberId) likedByMe.add(l.target_id as string);
    }
  }

  const toComment = (r: Row): TalkComment => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    authorId: r.author_id,
    authorName: r.members?.name ?? "회원",
    position1: r.members?.position1 ?? "MF",
    isManagerAuthor: r.members?.role === "manager",
    title: r.members?.title ?? null,
    likes: likeCount.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
    replies: [],
  });

  const byId = new Map<string, TalkComment>();
  const top: TalkComment[] = [];
  for (const r of rows) byId.set(r.id, toComment(r));
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id)!.replies.push(node);
    else top.push(node);
  }

  const post: TalkPost | null = postRow
    ? { id: postRow.id, body: postRow.body, createdAt: postRow.created_at, likes: likeCount.get(postRow.id) ?? 0, likedByMe: likedByMe.has(postRow.id) }
    : null;

  return { post, comments: top, commentCount: rows.length };
}

// 매치 상세 진입 버튼용 댓글 수 (코멘트 유무 + 댓글 수)
export async function getMatchTalkCount(matchId: string): Promise<{ hasPost: boolean; comments: number }> {
  const supabase = await createClient();
  const [postRes, cntRes] = await Promise.all([
    supabase.from("match_comments").select("id", { head: true, count: "exact" }).eq("match_id", matchId),
    supabase.from("comments").select("id", { head: true, count: "exact" }).eq("match_id", matchId),
  ]);
  return { hasPost: (postRes.count ?? 0) > 0, comments: cntRes.count ?? 0 };
}
