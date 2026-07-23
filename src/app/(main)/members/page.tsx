import Link from "next/link";
import { UserPlus } from "lucide-react";
import { getMembers } from "@/lib/data/members";
import { getMyProfile } from "@/lib/data/auth";
import { MemberList } from "@/components/member/member-list";

export default async function MembersPage() {
  const [members, profile] = await Promise.all([getMembers(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  const roster = members;

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-medium">
          멤버 <span className="text-[13px] text-subtle">{roster.length}명</span>
        </h1>
        {isManager && (
          <Link href="/admin/members/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
            <UserPlus size={15} /> 회원 등록
          </Link>
        )}
      </div>

      {roster.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">
          아직 등록된 회원이 없어요.
        </div>
      ) : (
        <MemberList members={roster} />
      )}
    </div>
  );
}
