import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { getMatch, getAttendanceMap } from "@/lib/data/matches";
import { getMembers } from "@/lib/data/members";
import { getGuests } from "@/lib/data/guests";
import { AttendanceManager } from "@/components/match/attendance-manager";
import { GuestManager } from "@/components/match/guest-manager";

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [members, map, guests] = await Promise.all([getMembers(), getAttendanceMap(id), getGuests(id)]);

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/matches/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">참석 관리 · {match.type === "self" ? match.opponent : `vs ${match.opponent}`}</h1>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">등록된 회원이 없어요.</div>
      ) : (
        <AttendanceManager
          matchId={id}
          members={members.map((m) => ({ id: m.id, name: m.name, position1: m.position1 }))}
          initial={map}
        />
      )}

      <div className="border-t border-divider pt-4">
        <GuestManager matchId={id} guests={guests} />
      </div>
    </div>
  );
}
