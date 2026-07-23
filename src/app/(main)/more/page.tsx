import Link from "next/link";
import {
  User, Users, Megaphone, Wallet, Shield, CalendarPlus, UserPlus, UserCheck,
  Settings, LogOut, ChevronRight,
} from "lucide-react";
import { getMyProfile } from "@/lib/data/auth";
import { getMembers } from "@/lib/data/members";
import { getPendingCount } from "@/lib/data/approvals";
import { signOut } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { appVersion } from "@/lib/app-version";

export default async function MorePage() {
  const profile = await getMyProfile();
  const member = (profile?.members ?? null) as
    | { id: string; name: string; role: string; position1?: string; title?: string | null }
    | null;
  const isManager = member?.role === "manager" || member?.role === "admin";
  const isAdmin = member?.role === "admin";
  const [members, pendingCount] = await Promise.all([getMembers(), isManager ? getPendingCount() : Promise.resolve(0)]);

  return (
    <div className="space-y-4">
      <h1 className="mb-6 text-lg font-medium">더보기</h1>

      {/* 프로필 미니 */}
      <Link
        href={member ? `/members/${member.id}` : "/more"}
        className="profile-card flex items-center gap-3 rounded-xl p-3.5"
      >
        <Avatar size={46} onDark />
        <div className="relative flex-1">
          <div className="text-[15px] font-medium text-white">
            {member?.name ?? profile?.kakao_nickname ?? "회원"}
          </div>
          <div className="text-[11px] text-navy-muted">
            {member ? `${member.position1} · CLEAR FC` : "프로필 미연결"}
          </div>
        </div>
        {member?.role === "manager" && <span className="rounded-xl bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white">{member.title ?? "운영진"}</span>}
      </Link>

      {/* 일반 메뉴 */}
      <div className="overflow-hidden rounded-xl border border-divider bg-card soft-card">
        {member && <Row icon={<User size={19} className="text-blue" />} label="내 프로필" href={`/members/${member.id}`} />}
        <Row icon={<Users size={19} className="text-blue" />} label="회원 목록" href="/members" right={`${members.length}명`} />
        <Row icon={<Megaphone size={19} className="text-blue" />} label="공지사항" href="/notices" />
        <Row icon={<Wallet size={19} className="text-subtle" />} label="회비" disabled badge="준비중" last />
      </div>

      {/* 운영진 전용 */}
      {isManager && (
        <div>
          <div className="mb-2 ml-1 text-xs text-subtle">
            <Shield size={13} className="mr-1 inline align-[-2px]" /> 운영진 전용
          </div>
          <div className="overflow-hidden rounded-xl border border-red/40 bg-card soft-card">
            <Row icon={<UserCheck size={19} className="text-red" />} label="가입 승인" href="/admin/approvals" right={pendingCount > 0 ? `${pendingCount}명 대기` : undefined} dot={pendingCount > 0} />
            <Row icon={<CalendarPlus size={19} className="text-red" />} label="매치 관리" href="/matches" />
            <Row icon={<UserPlus size={19} className="text-red" />} label="회원 관리" href="/admin/members" />
            <Row icon={<Settings size={19} className="text-red" />} label="팀 설정" href="/admin/team" last={!isAdmin} />
            {isAdmin && <Row icon={<Shield size={19} className="text-red" />} label="운영진 관리" href="/admin/managers" last />}
          </div>
        </div>
      )}

      {/* 푸터 */}
      <div className="overflow-hidden rounded-xl border border-divider bg-card soft-card">
        <Row icon={<Settings size={19} className="text-muted" />} label="설정" href="/settings" />
        <form action={signOut}>
          <button type="submit" className="flex w-full items-center gap-3 px-3.5 py-3">
            <LogOut size={19} className="text-subtle" />
            <span className="flex-1 text-left text-sm text-subtle">로그아웃</span>
          </button>
        </form>
      </div>

      <footer className="select-none pt-0.5 text-center" aria-label={`앱 버전 ${appVersion}`}>
        <div className="text-[10px] font-bold tracking-[0.16em] text-faint">CLEAR FC</div>
        <div className="mt-0.5 text-[9.5px] tracking-[0.08em] text-subtle">APP VERSION {appVersion}</div>
      </footer>
    </div>
  );
}

function Row({
  icon, label, href, right, disabled, badge, dot, last,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  right?: string;
  disabled?: boolean;
  badge?: string;
  dot?: boolean;
  last?: boolean;
}) {
  const content = (
    <div className={`flex items-center gap-3 px-3.5 py-3 ${last ? "" : "border-b border-divider"}`}>
      {icon}
      <span className={`flex-1 text-sm ${disabled ? "text-subtle" : ""}`}>{label}</span>
      {right && <span className={`text-xs ${dot ? "text-red" : "text-subtle"}`}>{right}</span>}
      {dot && <span className="h-2 w-2 rounded-full bg-pink" />}
      {badge && (
        <span className="rounded-[10px] border border-line bg-sunken px-2 py-0.5 text-[11px] text-muted">
          {badge}
        </span>
      )}
      {!disabled && <ChevronRight size={16} className="text-faint" />}
    </div>
  );
  if (href && !disabled) return <Link href={href}>{content}</Link>;
  return content;
}
