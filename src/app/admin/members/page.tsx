import { getMembers } from "@/lib/data/members";
import { MemberIndexList } from "@/components/admin/member-index-list";

export default async function AdminMembersPage() {
  const members = await getMembers();
  return <MemberIndexList members={members} />;
}
