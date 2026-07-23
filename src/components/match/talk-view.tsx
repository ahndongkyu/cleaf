"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Send, Pencil, Trash2, X } from "lucide-react";
import { POSITION_COLOR, type Position } from "@/lib/mock";
import { saveMatchComment, deleteMatchComment, addComment, deleteComment, toggleLike } from "@/lib/actions/comments";
import type { MatchTalk, TalkComment } from "@/lib/data/comments";
import { formatDateKo } from "@/lib/format";
import { TeamLogo } from "@/components/ui/team-brand";

export function TalkView({
  matchId,
  talk,
  isManager,
  canComment,
}: {
  matchId: string;
  talk: MatchTalk;
  isManager: boolean;
  canComment: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [postText, setPostText] = useState(talk.post?.body ?? "");
  const [newC, setNewC] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [, start] = useTransition();
  const router = useRouter();

  const savePost = () => {
    if (!postText.trim()) return;
    start(async () => { await saveMatchComment(matchId, postText); setEditing(false); router.refresh(); });
  };
  const removePost = () => {
    if (!window.confirm("코멘트를 삭제할까요?")) return;
    start(async () => { await deleteMatchComment(matchId); setPostText(""); router.refresh(); });
  };
  const submitComment = (parentId: string | null, text: string, clear: () => void) => {
    if (!text.trim()) return;
    start(async () => { await addComment(matchId, text, parentId); clear(); setReplyTo(null); router.refresh(); });
  };
  const removeComment = (id: string) => {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    start(async () => { await deleteComment(matchId, id); router.refresh(); });
  };

  return (
    <div className="space-y-4">
      {/* 운영진 코멘트 (게시글) */}
      {talk.post && !editing ? (
        <section className="rounded-2xl border border-line bg-card soft-card p-4">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="brand-logo flex h-9 w-9 items-center justify-center rounded-[11px]"><TeamLogo size={28} onDark /></div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-bold">
                운영진 <span className="rounded-[6px] bg-accent px-1.5 py-px text-[9px] font-bold text-white">공식</span>
              </div>
              <div className="text-[10.5px] text-subtle">{formatDateKo(talk.post.createdAt.slice(0, 10)).short} · 경기 총평</div>
            </div>
            {isManager && (
              <div className="flex gap-1">
                <button onClick={() => { setPostText(talk.post!.body); setEditing(true); }} className="rounded-md border border-line p-1.5 text-muted"><Pencil size={13} /></button>
                <button onClick={removePost} className="rounded-md border border-line p-1.5 text-danger"><Trash2 size={13} /></button>
              </div>
            )}
          </div>
          <div className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg">{talk.post.body}</div>
          <div className="mt-3 flex items-center gap-4 border-t border-divider pt-2.5">
            <LikeBtn matchId={matchId} target="post" targetId={talk.post.id} likes={talk.post.likes} liked={talk.post.likedByMe} disabled={!canComment} />
            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-muted"><MessageCircle size={15} /> {talk.commentCount}</span>
          </div>
        </section>
      ) : isManager ? (
        <section className="rounded-2xl border border-line bg-card soft-card p-4">
          <div className="mb-2 text-[13px] font-bold">경기 코멘트 <span className="text-[11px] font-normal text-subtle">(운영진 총평)</span></div>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            maxLength={300}
            placeholder="오늘 경기 총평을 남겨보세요."
            className="min-h-[92px] w-full resize-none rounded-lg border border-line bg-sunken p-3 text-[13.5px] leading-relaxed outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            {editing && <button onClick={() => setEditing(false)} className="rounded-lg border border-line px-3 py-2 text-[13px] text-muted">취소</button>}
            <button onClick={savePost} className="rounded-lg bg-red px-4 py-2 text-[13px] font-bold text-white">저장</button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-divider bg-card soft-card px-4 py-8 text-center text-[13px] text-subtle">
          아직 운영진 코멘트가 없어요.
        </section>
      )}

      {/* 댓글 */}
      <div>
        <div className="mb-3 px-0.5 text-[13px] font-bold text-fg">댓글 {talk.commentCount}</div>

        {canComment && (
          <div className="mb-4 flex items-center gap-2">
            <input
              value={newC}
              onChange={(e) => setNewC(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(null, newC, () => setNewC("")); }}
              placeholder="댓글 달기…"
              className="flex-1 rounded-full border border-line bg-sunken px-4 py-2.5 text-[13px] outline-none"
            />
            <button onClick={() => submitComment(null, newC, () => setNewC(""))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Send size={15} /></button>
          </div>
        )}

        {talk.comments.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-faint">첫 댓글을 남겨보세요.</div>
        ) : (
          <div className="space-y-3.5">
            {talk.comments.map((c) => (
              <div key={c.id}>
                <CommentItem c={c} matchId={matchId} canComment={canComment} onReply={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }} onDelete={() => removeComment(c.id)} />
                {c.replies.map((r) => (
                  <div key={r.id} className="ml-9 mt-3">
                    <CommentItem c={r} matchId={matchId} canComment={canComment} reply onDelete={() => removeComment(r.id)} />
                  </div>
                ))}
                {replyTo === c.id && canComment && (
                  <div className="ml-9 mt-2.5 flex items-center gap-2">
                    <input
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") submitComment(c.id, replyText, () => setReplyText("")); }}
                      placeholder={`${c.authorName}에게 답글…`}
                      className="flex-1 rounded-full border border-line bg-sunken px-3.5 py-2 text-[12.5px] outline-none"
                    />
                    <button onClick={() => setReplyTo(null)} className="text-subtle"><X size={16} /></button>
                    <button onClick={() => submitComment(c.id, replyText, () => setReplyText(""))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Send size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  c, matchId, canComment, reply, onReply, onDelete,
}: {
  c: TalkComment; matchId: string; canComment: boolean; reply?: boolean; onReply?: () => void; onDelete: () => void;
}) {
  const color = POSITION_COLOR[c.position1 as Position] ?? "#889";
  const size = reply ? "h-6.5 w-6.5 text-[9px]" : "h-[30px] w-[30px] text-[10px]";
  return (
    <div className="flex gap-2.5">
      <span className={`flex ${size} shrink-0 items-center justify-center rounded-full font-bold text-white`} style={{ background: color, height: reply ? 26 : 30, width: reply ? 26 : 30 }}>
        {c.authorName.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[12.5px] font-bold">
          {c.authorName}
          {c.isManagerAuthor && <span className="rounded-[5px] bg-accent px-1 py-px text-[8px] font-bold text-white">{c.title ?? "운영진"}</span>}
        </div>
        <div className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-fg">{c.body}</div>
        <div className="mt-1.5 flex items-center gap-3.5 text-[10.5px] text-subtle">
          <span>{timeago(c.createdAt)}</span>
          <LikeBtn matchId={matchId} target="comment" targetId={c.id} likes={c.likes} liked={c.likedByMe} disabled={!canComment} small />
          {!reply && canComment && <button onClick={onReply} className="font-bold text-subtle">답글</button>}
          <button onClick={onDelete} className="font-bold text-faint">삭제</button>
        </div>
      </div>
    </div>
  );
}

function LikeBtn({
  matchId, target, targetId, likes, liked, disabled, small,
}: {
  matchId: string; target: "post" | "comment"; targetId: string; likes: number; liked: boolean; disabled?: boolean; small?: boolean;
}) {
  const [on, setOn] = useState(liked);
  const [count, setCount] = useState(likes);
  const [, start] = useTransition();
  return (
    <button
      disabled={disabled}
      onClick={() => { const n = !on; setOn(n); setCount((c) => c + (n ? 1 : -1)); start(() => toggleLike(matchId, target, targetId)); }}
      className={`flex items-center gap-1 font-bold disabled:opacity-50 ${small ? "text-[10.5px]" : "text-[12.5px]"} ${on ? "text-[#e8305a]" : small ? "text-subtle" : "text-muted"}`}
    >
      <Heart size={small ? 12 : 15} fill={on ? "currentColor" : "none"} /> {count}
    </button>
  );
}

function timeago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return formatDateKo(iso.slice(0, 10)).short;
}
