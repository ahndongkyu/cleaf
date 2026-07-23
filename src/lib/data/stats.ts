import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/lib/mock";
import { currentSeason } from "@/lib/season";
import { dateInSeoul } from "@/lib/date";

export type MemberStat = {
  id: string;
  name: string;
  position1: Position;
  position2: string | null; // 상세 포지션 코드 (WF·CF·CM…)
  goals: number;
  assists: number;
  attackPoints: number; // 득점 + 도움
  games: number; // 참석(출전) 경기 수
  attendRate: number; // %
  mvp: number;
};

export type HomeMemberStat = Pick<MemberStat, "games" | "goals" | "assists" | "attendRate">;
export type HomeMemberResultStat = HomeMemberStat & {
  win: number;
  draw: number;
  loss: number;
  winRate: number;
};
export type HomeMemberMatchStat = HomeMemberResultStat & {
  goalsFor: number;
  goalsAgainst: number;
};

export async function getMemberStats(season: number = currentSeason()): Promise<MemberStat[]> {
  const supabase = await createClient();
  const [membersRes, goalsRes, attRes, matchesRes, votesRes] = await Promise.all([
    supabase.from("members").select("id, name, position1, position2").eq("status", "active"),
    supabase.from("goals").select("match_id, scorer_id, assist_id"),
    supabase.from("attendances").select("match_id, member_id").eq("status", "going"),
    supabase.from("matches").select("id, match_date, mom_vote_close, status"),
    supabase.from("mvp_votes").select("match_id, target_id"),
  ]);

  const members = membersRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const today = dateInSeoul();
  // 해당 시즌(연도) 중 오늘까지 진행된 경기 id 집합 — 예정 경기는 출전/출석률에서 제외
  const inSeason = new Set(
    matches
      .filter((m) => Number(m.match_date.slice(0, 4)) === season && m.match_date <= today && m.status !== "cancelled")
      .map((m) => m.id),
  );
  const goals = (goalsRes.data ?? []).filter((g) => inSeason.has(g.match_id));
  const att = (attRes.data ?? []).filter((a) => inSeason.has(a.match_id));
  const votes = (votesRes.data ?? []).filter((v) => inSeason.has(v.match_id));
  const totalMatches = inSeason.size;

  const g: Record<string, number> = {};
  const a: Record<string, number> = {};
  const att2: Record<string, number> = {};
  const mvp: Record<string, number> = {};
  for (const row of goals) {
    if (row.scorer_id) g[row.scorer_id] = (g[row.scorer_id] ?? 0) + 1;
    if (row.assist_id) a[row.assist_id] = (a[row.assist_id] ?? 0) + 1;
  }
  for (const row of att) att2[row.member_id as string] = (att2[row.member_id as string] ?? 0) + 1;

  // MOM = 마감된 경기의 최다 득표자 (동점 시 공동)
  const now = Date.now();
  const closedIds = new Set(
    matches
      .filter((m) => inSeason.has(m.id) && m.mom_vote_close && now >= new Date(m.mom_vote_close).getTime())
      .map((m) => m.id),
  );
  const tally: Record<string, Record<string, number>> = {};
  for (const v of votes) {
    if (!closedIds.has(v.match_id)) continue;
    (tally[v.match_id] ??= {})[v.target_id] = (tally[v.match_id]?.[v.target_id] ?? 0) + 1;
  }
  for (const matchId of Object.keys(tally)) {
    const c = tally[matchId];
    const max = Math.max(...Object.values(c));
    if (max <= 0) continue;
    for (const [tid, cnt] of Object.entries(c)) if (cnt === max) mvp[tid] = (mvp[tid] ?? 0) + 1;
  }

  return members.map((m) => {
    const goalsN = g[m.id] ?? 0;
    const assistsN = a[m.id] ?? 0;
    const games = att2[m.id] ?? 0;
    return {
      id: m.id,
      name: m.name,
      position1: m.position1 as Position,
      position2: ((m as { position2?: string | null }).position2 as string | null) ?? null,
      goals: goalsN,
      assists: assistsN,
      attackPoints: goalsN + assistsN,
      games,
      attendRate: totalMatches ? Math.round((games / totalMatches) * 100) : 0,
      mvp: mvp[m.id] ?? 0,
    };
  });
}

export async function getMemberStat(id: string, season: number = currentSeason()): Promise<MemberStat | null> {
  const all = await getMemberStats(season);
  return all.find((s) => s.id === id) ?? null;
}

// 홈의 내 기록 카드용: 전체·매칭·자체전 기준을 같은 규칙으로 분리한다.
export async function getHomeMemberStats(memberId: string, season: number = currentSeason()) {
  const supabase = await createClient();
  const [matchesRes, goalsRes, attendanceRes] = await Promise.all([
    supabase.from("matches").select("id, match_date, status, type, score_for, score_against"),
    supabase.from("goals").select("match_id, scorer_id, assist_id"),
    supabase.from("attendances").select("match_id, member_id, status, team_side").eq("member_id", memberId).eq("status", "going"),
  ]);

  const today = dateInSeoul();
  const completed = (matchesRes.data ?? []).filter(
    (match) => Number(match.match_date.slice(0, 4)) === season && match.match_date <= today && match.status !== "cancelled",
  );
  const matchIds = new Set(completed.map((match) => match.id));
  const attendanceByMatch = new Map(
    (attendanceRes.data ?? [])
      .filter((row) => matchIds.has(row.match_id))
      .map((row) => [row.match_id, row.team_side as string | null]),
  );
  const goals = (goalsRes.data ?? []).filter((goal) => matchIds.has(goal.match_id));

  const makeStat = (type?: "match" | "self"): HomeMemberStat => {
    const scoped = type ? completed.filter((match) => match.type === type) : completed;
    const scopedIds = new Set(scoped.map((match) => match.id));
    let goalsCount = 0;
    let assistsCount = 0;
    for (const goal of goals) {
      if (!scopedIds.has(goal.match_id)) continue;
      if (goal.scorer_id === memberId) goalsCount++;
      if (goal.assist_id === memberId) assistsCount++;
    }
    const games = [...attendanceByMatch.keys()].filter((matchId) => scopedIds.has(matchId)).length;
    return {
      games,
      goals: goalsCount,
      assists: assistsCount,
      attendRate: scoped.length ? Math.round((games / scoped.length) * 100) : 0,
    };
  };

  const makeResult = (type?: "match" | "self") => {
    let win = 0;
    let draw = 0;
    let loss = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const item of completed) {
      if ((type && item.type !== type) || !attendanceByMatch.has(item.id) || item.score_for === null || item.score_against === null) continue;
      const scoreFor = item.score_for;
      const scoreAgainst = item.score_against;
      if (item.type === "self") {
        const side = attendanceByMatch.get(item.id);
        if (side !== "red" && side !== "sky") continue;
        const myScore = side === "red" ? scoreFor : scoreAgainst;
        const opponentScore = side === "red" ? scoreAgainst : scoreFor;
        if (myScore > opponentScore) win++;
        else if (myScore < opponentScore) loss++;
        else draw++;
        continue;
      }
      goalsFor += scoreFor;
      goalsAgainst += scoreAgainst;
      if (scoreFor > scoreAgainst) win++;
      else if (scoreFor < scoreAgainst) loss++;
      else draw++;
    }
    const decided = win + draw + loss;
    return { win, draw, loss, winRate: decided ? Math.round((win / decided) * 100) : 0, goalsFor, goalsAgainst };
  };

  const match = makeStat("match");
  const matchResult = makeResult("match");
  const self = makeStat("self");
  const selfResult = makeResult("self");
  const allResult = makeResult();

  return {
    all: { ...makeStat(), winRate: allResult.winRate },
    match: { ...match, ...matchResult },
    self: { ...self, ...selfResult },
  };
}
