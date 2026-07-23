import Link from "next/link";
import { notFound } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { getMatch, getMatchAttendances, getMatchGoals, type GoalRow } from "@/lib/data/matches";
import { getMembers } from "@/lib/data/members";
import { getGuests } from "@/lib/data/guests";
import { deleteGoal } from "@/lib/actions/results";
import { ScoreEditor, GoalAdder, type GoalPlayer } from "@/components/match/result-editor";

type TeamSide = "red" | "sky";
type ScorerRow = { key: string; name: string; count: number; assists: string[]; lastId?: string };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, goals, members, guests] = await Promise.all([
    getMatchAttendances(id),
    getMatchGoals(id),
    getMembers(),
    getGuests(id),
  ]);

  const memberName = new Map(members.map((member) => [member.id, member.name]));
  const guestName = new Map(guests.map((guest) => [guest.id, guest.name]));
  const memberSide = new Map(
    attendances
      .filter((attendance) => attendance.status === "going" && attendance.members)
      .map((attendance) => [attendance.members!.id, attendance.team_side]),
  );
  const guestSide = new Map(guests.map((guest) => [guest.id, guest.team_side]));

  const memberPool = attendances
    .filter((attendance) => attendance.status === "going" && attendance.members)
    .map((attendance) => ({
      id: `member:${attendance.members!.id}`,
      name: attendance.members!.name,
      side: attendance.team_side,
    }));
  const guestPool = guests.map((guest) => ({
    id: `guest:${guest.id}`,
    name: guest.name === "용병" ? "용병" : `${guest.name} (용병)`,
    side: guest.team_side,
  }));
  const pool: GoalPlayer[] = [...memberPool, ...guestPool].map(({ id: actorId, name }) => ({ id: actorId, name }));
  const selfPools = match.type === "self"
    ? {
        red: [...memberPool, ...guestPool].filter((player) => player.side === "red").map(({ id: actorId, name }) => ({ id: actorId, name })),
        sky: [...memberPool, ...guestPool].filter((player) => player.side === "sky").map(({ id: actorId, name }) => ({ id: actorId, name })),
      }
    : undefined;

  function goalSide(goal: GoalRow): TeamSide | null {
    if (goal.team_side === "red" || goal.team_side === "sky") return goal.team_side;
    if (goal.scorer_id) {
      const side = memberSide.get(goal.scorer_id);
      if (side === "red" || side === "sky") return side;
    }
    if (goal.scorer_guest_id) {
      const side = guestSide.get(goal.scorer_guest_id);
      if (side === "red" || side === "sky") return side;
    }
    return null;
  }

  function actorName(goal: GoalRow, role: "scorer" | "assist") {
    const memberId = role === "scorer" ? goal.scorer_id : goal.assist_id;
    const guestId = role === "scorer" ? goal.scorer_guest_id : goal.assist_guest_id;
    if (memberId) return memberName.get(memberId) ?? "선수";
    if (guestId) {
      const name = guestName.get(guestId) ?? "용병";
      return name === "용병" ? "용병" : `${name} (용병)`;
    }
    return role === "scorer" ? "득점" : "";
  }

  function summariesFor(teamSide?: TeamSide | null) {
    const scorerRows = new Map<string, ScorerRow>();
    const ownIds: string[] = [];
    for (const goal of goals) {
      if (teamSide !== undefined && goalSide(goal) !== teamSide) continue;
      if (goal.is_own_goal) {
        ownIds.push(goal.id);
        continue;
      }
      const key = goal.scorer_id ? `member:${goal.scorer_id}` : goal.scorer_guest_id ? `guest:${goal.scorer_guest_id}` : "?";
      const row = scorerRows.get(key) ?? { key, name: actorName(goal, "scorer"), count: 0, assists: [] };
      row.count += 1;
      row.lastId = goal.id;
      const assist = actorName(goal, "assist");
      if (assist && !row.assists.includes(assist)) row.assists.push(assist);
      scorerRows.set(key, row);
    }
    return { scorers: [...scorerRows.values()], ownIds };
  }

  const normalRecords = summariesFor();
  const redRecords = summariesFor("red");
  const blueRecords = summariesFor("sky");
  const unknownRecords = summariesFor(null);
  const redEntered = goals.filter((goal) => goalSide(goal) === "red").length;
  const blueEntered = goals.filter((goal) => goalSide(goal) === "sky").length;

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/matches/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">
          결과 입력 · {match.type === "self" ? "레드 vs 블루" : `vs ${match.opponent}`}
        </h1>
      </div>

      <div>
        <div className="mb-2 text-[13px] text-muted">최종 스코어</div>
        <ScoreEditor
          matchId={id}
          initialFor={match.score_for ?? 0}
          initialAgainst={match.score_against ?? 0}
          forLabel={match.type === "self" ? "레드" : "CLEAR"}
          againstLabel={match.type === "self" ? "블루" : "상대"}
        />
      </div>

      <div>
        <div className="mb-2 text-[13px] text-muted">
          {match.type === "self" ? "팀별 득점·도움 상세" : "우리 득점 상세"} <span className="text-faint">(통계용)</span>
        </div>

        {match.type === "self" ? (
          <>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <GoalCheck label="레드" entered={redEntered} target={match.score_for ?? 0} tone="red" />
              <GoalCheck label="블루" entered={blueEntered} target={match.score_against ?? 0} tone="blue" />
            </div>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <TeamGoalRecords label="레드" tone="red" records={redRecords} matchId={id} />
              <TeamGoalRecords label="블루" tone="blue" records={blueRecords} matchId={id} />
            </div>
            {(unknownRecords.scorers.length > 0 || unknownRecords.ownIds.length > 0) && (
              <div className="mb-2.5">
                <TeamGoalRecords label="팀 미지정 기록" tone="neutral" records={unknownRecords} matchId={id} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-2.5">
              <GoalCheck label="득점" entered={goals.length} target={match.score_for ?? 0} tone="normal" />
            </div>
            {(normalRecords.scorers.length > 0 || normalRecords.ownIds.length > 0) && (
              <div className="mb-2.5">
                <TeamGoalRecords label="" tone="neutral" records={normalRecords} matchId={id} />
              </div>
            )}
          </>
        )}

        <GoalAdder matchId={id} pool={pool} selfPools={selfPools} />
      </div>

      <p className="text-center text-[11px] text-subtle">MOM은 경기 종료 후 참석자 투표로 자동 선정돼요.</p>
    </div>
  );
}

function GoalCheck({
  label,
  entered,
  target,
  tone,
}: {
  label: string;
  entered: number;
  target: number;
  tone: "red" | "blue" | "normal";
}) {
  const matched = entered === target;
  const color = matched ? "#1d9e75" : entered < target ? "#e8912b" : "#dc2f3c";
  const pct = target > 0 ? Math.min(100, Math.round((entered / target) * 100)) : entered > 0 ? 100 : 0;
  const labelColor = tone === "red" ? "#e83d4f" : tone === "blue" ? "#1976c9" : color;
  return (
    <div className="rounded-xl px-3 py-2.5 text-[12px] font-bold" style={{ background: `${color}1f`, color }}>
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span style={{ color: labelColor }}>{label}</span>
        <span>{entered}/{target}골</span>
      </div>
      <span className="block h-[6px] overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,.09)" }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </span>
    </div>
  );
}

function TeamGoalRecords({
  label,
  tone,
  records,
  matchId,
}: {
  label: string;
  tone: "red" | "blue" | "neutral";
  records: { scorers: ScorerRow[]; ownIds: string[] };
  matchId: string;
}) {
  const empty = records.scorers.length === 0 && records.ownIds.length === 0;
  const headingClass = tone === "red" ? "text-danger" : tone === "blue" ? "text-blue" : "text-muted";
  return (
    <div className="h-full overflow-hidden rounded-xl border border-divider bg-card soft-card">
      {label && <div className={`border-b border-divider px-3 py-2 text-[11px] font-extrabold ${headingClass}`}>{label}</div>}
      {empty ? (
        <div className="px-2 py-5 text-center text-[11px] text-faint">기록 없음</div>
      ) : (
        <>
          {records.scorers.map((scorer) => (
            <div key={scorer.key} className="border-b border-divider px-2.5 py-2 last:border-b-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] leading-none">{"⚽".repeat(scorer.count)}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{scorer.name}</span>
                <DeleteGoalButton goalId={scorer.lastId} matchId={matchId} />
              </div>
              {scorer.assists.length > 0 && <div className="mt-1 truncate text-[10px] text-subtle">도움 {scorer.assists.join(", ")}</div>}
            </div>
          ))}
          {records.ownIds.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <span className="text-[12px]">{"⚽".repeat(records.ownIds.length)}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted">자책골</span>
              <DeleteGoalButton goalId={records.ownIds.at(-1)} matchId={matchId} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeleteGoalButton({ goalId, matchId }: { goalId?: string; matchId: string }) {
  if (!goalId) return null;
  return (
    <form action={deleteGoal}>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="matchId" value={matchId} />
      <button type="submit" aria-label="삭제">
        <Trash2 size={14} className="text-faint" />
      </button>
    </form>
  );
}
