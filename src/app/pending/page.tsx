import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { getMyProfile } from "@/lib/data/auth";
import { SignupForm } from "@/components/auth/signup-form";
import { TeamLogo } from "@/components/ui/team-brand";

export default async function PendingPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.member_id) redirect("/"); // 이미 승인됨

  const p = profile as {
    claimed_name?: string | null;
    claimed_position1?: string | null;
    claimed_position2?: string | null;
    claimed_num_red?: number | null;
    claimed_num_blue?: number | null;
    signup_rejected_at?: string | null;
  };
  const claimed = p.claimed_name ?? "";

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="hero-card w-full rounded-2xl px-5 py-8">
        <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[16px] bg-white/10">
          <TeamLogo size={42} onDark />
        </div>
        <div className="relative mb-1 text-center text-[17px] font-bold text-white">CLEAR FC 가입 신청</div>
        <p className="relative mb-5 text-center text-[12px] leading-relaxed text-navy-muted">
          정보를 입력하면 운영진이 확인 후 승인해요
        </p>

        {claimed && (
          <div className={`relative mb-4 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] ${p.signup_rejected_at ? "bg-red/15 text-[#ff9aa4]" : "bg-white/[0.06] text-navy-muted"}`}>
            <Check size={14} className="text-[#5dcaa5]" />
            <span>
              <b className="text-white">{claimed}</b> 님으로 신청됨 · {p.signup_rejected_at ? "거절됨 · 수정 후 다시 신청해주세요" : "승인 대기 중"}
            </span>
          </div>
        )}

        <SignupForm
          defaultName={claimed}
          defaultPos1={p.claimed_position1 ?? ""}
          defaultPos2={p.claimed_position2 ?? ""}
          defaultNumRed={p.claimed_num_red != null ? String(p.claimed_num_red) : ""}
          defaultNumBlue={p.claimed_num_blue != null ? String(p.claimed_num_blue) : ""}
          submitted={!!claimed}
        />

        <div className="relative mt-3 text-center text-[10.5px] leading-relaxed text-navy-soft">
          명단에 없어도 이 정보로 새로 등록돼요.
        </div>

        <form action={signOut} className="relative mt-4 text-center">
          <button className="rounded-[10px] border border-navy-soft px-5 py-2 text-[12px] text-navy-muted">로그아웃</button>
        </form>
      </div>
    </div>
  );
}
