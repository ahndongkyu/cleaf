import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch, getMatchAttendances } from "@/lib/data/matches";
import { getFormation } from "@/lib/data/formations";
import { getMembers } from "@/lib/data/members";
import { getGuests } from "@/lib/data/guests";
import { getMyProfile } from "@/lib/data/auth";
import { MatchFormation, type PoolPlayer } from "@/components/formation/match-formation";
import { SelfMatchFormations, type SelfMatchParticipant } from "@/components/formation/self-match-formations";
import { AWAY_UNIFORM, HOME_UNIFORM } from "@/lib/uniforms";

export default async function MatchFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, initial, redInitial, skyInitial, members, guests, profile] = await Promise.all([
    getMatchAttendances(id),
    getFormation(id, "all"),
    match.type === "self" ? getFormation(id, "red") : Promise.resolve(null),
    match.type === "self" ? getFormation(id, "sky") : Promise.resolve(null),
    getMembers(),
    getGuests(id),
    getMyProfile(),
  ]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  const numOf = (mn: { uniform: string; number: number }[], uniform = match.uniform) =>
    mn.find((n) => n.uniform === uniform)?.number ?? mn[0]?.number ?? null;

  const attendingMembers = attendances.filter((a) => a.status === "going" && a.members);
  const guestName = (name: string) => name === "용병" ? "용병" : `${name} (용병)`;
  const pool: PoolPlayer[] = [
    ...attendingMembers
      .map((a) => ({ id: a.members!.id, name: a.members!.name, number: numOf(a.members!.member_numbers) })),
    ...guests.map((g) => ({ id: `guest:${g.id}`, name: guestName(g.name), number: null })),
  ];
  const selfParticipants: SelfMatchParticipant[] = [
    ...attendingMembers
      .map((a) => ({
        id: a.members!.id,
        entityId: a.members!.id,
        kind: "member" as const,
        name: a.members!.name,
        position1: a.members!.position1,
        teamSide: a.team_side,
        redNumber: numOf(a.members!.member_numbers, HOME_UNIFORM),
        blueNumber: numOf(a.members!.member_numbers, AWAY_UNIFORM),
      })),
    ...guests
      .map((g) => ({
        id: `guest:${g.id}`,
        entityId: g.id,
        kind: "guest" as const,
        name: guestName(g.name),
        position1: g.position1,
        teamSide: g.team_side,
        redNumber: null,
        blueNumber: null,
      })),
  ];
  const unassignedCount = selfParticipants.filter((participant) => !participant.teamSide).length;

  const poolIds = new Set(pool.map((p) => p.id));
  const roster: PoolPlayer[] = members
    .filter((m) => !poolIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, number: numOf(m.member_numbers) }));

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/matches/${id}`} className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">포메이션</span>
        </Link>
      </div>

      {match.type === "self" ? (
        <>
          {unassignedCount > 0 && (
            <div className="rounded-xl border border-[#e8912b]/30 bg-[#e8912b]/10 px-4 py-3 text-[12px] leading-relaxed text-[#b86d12]">
              팀 미배정 참석자 {unassignedCount}명이 있어요.
              {isManager && (
                <>
                  {" "}
                  레드 또는 블루 탭에서 배정해 주세요.
                </>
              )}
            </div>
          )}
          <SelfMatchFormations
            matchId={id}
            participants={selfParticipants}
            redInitial={redInitial}
            skyInitial={skyInitial}
            isManager={isManager}
          />
        </>
      ) : pool.length === 0 && roster.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] leading-relaxed text-muted">
          등록된 회원이 없어요.
        </div>
      ) : (
        <MatchFormation matchId={id} opponent={match.opponent} pool={pool} roster={roster} isManager={isManager} initial={initial} />
      )}
    </div>
  );
}
