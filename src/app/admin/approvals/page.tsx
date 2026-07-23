import Link from "next/link";
import { X } from "lucide-react";
import { getPendingProfiles, getLinkedMemberIds } from "@/lib/data/approvals";
import { getMembers } from "@/lib/data/members";
import { ApprovalRow } from "@/components/admin/approval-row";

export default async function ApprovalsPage() {
  const [pending, members, linked] = await Promise.all([
    getPendingProfiles(),
    getMembers(),
    getLinkedMemberIds(),
  ]);

  const unlinked = members
    .filter((m) => !linked.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, position1: m.position1 }));

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/more">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">가입 승인 <span className="text-[13px] text-subtle">{pending.length}</span></h1>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        이름이 명단과 같으면 <span className="font-medium text-accent">자동 매칭</span>돼요. 명단에 없으면 신청 정보로 <span className="font-medium text-red">새 회원 등록</span>도 가능해요.
      </p>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">
          승인 대기 중인 회원이 없어요.
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map((p) => (
            <ApprovalRow key={p.id} profile={p} members={unlinked} />
          ))}
        </div>
      )}
    </div>
  );
}
