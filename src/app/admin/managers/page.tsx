import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { isAdmin } from "@/lib/data/auth";
import { getManagerTitles } from "@/lib/data/titles";
import { getMembers } from "@/lib/data/members";
import { ManagerTitles } from "@/components/settings/manager-titles";

export default async function ManagersPage() {
  if (!(await isAdmin())) redirect("/more"); // 관리자 전용

  const [titles, members] = await Promise.all([getManagerTitles(), getMembers()]);
  const managers = members
    .filter((m) => m.role === "manager")
    .map((m) => ({ id: m.id, name: m.name, position1: m.position1, title: m.title }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/more">
          <ArrowLeft size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">운영진 관리</h1>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-muted">
        <Shield size={12} className="mr-1 inline align-[-1px] text-red" /> 관리자 전용 · 세부 직책(감독·총무·주장)은 <b>권한은 동일</b>하고 표시용이에요.
      </p>
      <ManagerTitles titles={titles} managers={managers} />
    </div>
  );
}
