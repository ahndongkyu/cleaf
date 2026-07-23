import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";
import { getMemberById, getMemberKakaoLink } from "@/lib/data/members";
import { getMemberStat } from "@/lib/data/stats";
import { isManager, getMyProfile } from "@/lib/data/auth";
import { POSITION_LABEL, POSITION_BADGE, DETAIL_POSITION_LABEL } from "@/lib/mock";
import { Avatar } from "@/components/ui/avatar";
import { getUniformSwatch } from "@/lib/uniforms";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, manager, stat, profile] = await Promise.all([getMemberById(id), isManager(), getMemberStat(id), getMyProfile()]);
  if (!m) notFound();
  const kakaoConnected = manager ? await getMemberKakaoLink(id) : false;

  const mine = ((profile?.member_id as string | null) ?? null) === id;
  const badge = POSITION_BADGE[m.position1];

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/members" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">회원정보</span>
        </Link>
        {(manager || mine) && (
          <Link href={`/members/${id}/edit`} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted">
            <Pencil size={14} /> {mine && !manager ? "내 정보 수정" : "편집"}
          </Link>
        )}
      </div>

      <section className="profile-card rounded-2xl px-4 py-5 text-center text-white">
        <div className="mx-auto mb-2.5 flex justify-center">
          <Avatar size={64} onDark />
        </div>
        <div className="text-[17px] font-medium">{m.name}</div>
        {m.nickname && <div className="text-xs text-navy-muted">@{m.nickname}</div>}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          {m.role === "manager" && <span className="rounded-xl bg-accent px-2.5 py-0.5 text-[11px] font-bold">운영진{m.title ? ` · ${m.title}` : ""}</span>}
          <span className="rounded-xl px-2.5 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>
            {m.position1} {POSITION_LABEL[m.position1]}
          </span>
          {m.position2 && (
            <span className="rounded-xl bg-white/10 px-2.5 py-0.5 text-[11px] text-navy-muted">
              {m.position2}{DETAIL_POSITION_LABEL[m.position2] ? ` · ${DETAIL_POSITION_LABEL[m.position2]}` : ""}
            </span>
          )}
        </div>
      </section>

      {manager && (
        <section>
          <h2 className="mb-2.5 text-[13px] text-muted">계정 연동</h2>
          <div className="flex items-center gap-3 rounded-xl border border-divider bg-card soft-card px-3.5 py-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${kakaoConnected ? "bg-tint text-accent" : "bg-sunken text-subtle"}`}>
              <MessageCircle size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-fg">카카오 계정 {kakaoConnected ? "연결됨" : "미연결"}</div>
              <div className="mt-0.5 text-[11px] text-subtle">
                {kakaoConnected ? "카카오 로그인 계정과 연결되어 있어요." : "연결된 카카오 로그인 계정이 없어요."}
              </div>
            </div>
            <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${kakaoConnected ? "bg-tint text-accent" : "bg-sunken text-subtle"}`}>
              {kakaoConnected ? "연결" : "미연결"}
            </span>
          </div>
        </section>
      )}

      <div>
        <h2 className="mb-2.5 text-[13px] text-muted">유니폼별 등번호</h2>
        {m.member_numbers.length ? (
          <div className="grid grid-cols-2 gap-2.5">
            {m.member_numbers.map((n) => (
              <div key={n.uniform} className="flex items-center gap-2.5 rounded-xl border border-divider bg-card soft-card px-3 py-2.5">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border-2 border-ink text-base font-medium text-white" style={{ background: getUniformSwatch(n.uniform) }}>
                  {n.number}
                </div>
                <div>
                  <div className="text-[13px] font-medium">{n.uniform}</div>
                  <div className="text-[11px] text-subtle">{n.number}번</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-divider bg-card soft-card px-4 py-6 text-center text-[13px] text-subtle">등록된 등번호가 없어요.</div>
        )}
      </div>

      <div>
        <h2 className="mb-2.5 text-[13px] text-muted">{new Date().getFullYear()} 시즌 기록</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat v={stat?.games ?? 0} l="출전" />
          <Stat v={stat?.goals ?? 0} l="득점" />
          <Stat v={stat?.assists ?? 0} l="도움" />
          <Stat v={stat?.attackPoints ?? 0} l="공격P" />
          <Stat v={`${stat?.attendRate ?? 0}%`} l="출석률" />
          <Stat v={stat?.mvp ?? 0} l="MOM" />
        </div>
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="rounded-lg bg-sunken px-2 py-3 text-center">
      <div className="text-xl font-medium">{v}</div>
      <div className="mt-0.5 text-[11px] text-subtle">{l}</div>
    </div>
  );
}
