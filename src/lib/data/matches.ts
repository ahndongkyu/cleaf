import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/lib/positions";
import { dateInSeoul, yearInSeoul } from "@/lib/date";

export type MatchRow = {
  id: string;
  created_at: string;
  opponent: string;
  match_date: string;
  match_time: string | null;
  place: string | null;
  place_address: string | null;
  place_lat: number | null;
  place_lng: number | null;
  type: "match" | "self";
  uniform: string | null;
  score_for: number | null;
  score_against: number | null;
  youtube_url: string | null;
  status: string;
  cancel_reason: string | null;
  mvp_member_id: string | null;
  mom_vote_close: string | null;
};

export type AttendanceRow = {
  status: "going" | "notGoing" | "undecided";
  is_guest: boolean;
  team_side: "red" | "sky" | null;
  members: {
    id: string;
    name: string;
    position1: Position;
    member_numbers: { uniform: string; number: number }[];
  } | null;
};

export function isPast(m: { match_date: string; score_for: number | null; status?: string }) {
  const today = dateInSeoul();
  return m.status === "cancelled" || m.score_for !== null || m.match_date < today;
}

export function getCancelReasonLabel(reason: string | null) {
  return reason?.replace(/으로 취소$/, "") || "경기 취소";
}

export async function getMatches(): Promise<MatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, created_at, opponent, match_date, match_time, place, place_address, place_lat, place_lng, type, uniform, score_for, score_against, youtube_url, status, cancel_reason, mvp_member_id")
    .order("match_date", { ascending: false });
  if (error) {
    console.error("getMatches", error);
    return [];
  }
  return (data ?? []) as MatchRow[];
}

export async function getMatch(id: string): Promise<MatchRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, created_at, opponent, match_date, match_time, place, place_address, place_lat, place_lng, type, uniform, score_for, score_against, youtube_url, status, cancel_reason, mvp_member_id, mom_vote_close")
    .eq("id", id)
    .maybeSingle();
  return (data as MatchRow) ?? null;
}

export async function getMatchAttendances(matchId: string): Promise<AttendanceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select("status, is_guest, team_side, members(id, name, position1, member_numbers(uniform, number))")
    .eq("match_id", matchId);
  return (data ?? []) as unknown as AttendanceRow[];
}

export type GoalRow = {
  id: string;
  scorer_id: string | null;
  assist_id: string | null;
  scorer_guest_id: string | null;
  assist_guest_id: string | null;
  team_side: "red" | "sky" | null;
  is_own_goal: boolean;
};

export async function getMatchGoals(matchId: string): Promise<GoalRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("id, scorer_id, assist_id, scorer_guest_id, assist_guest_id, team_side, is_own_goal")
    .eq("match_id", matchId)
    .order("created_at");
  return (data ?? []) as GoalRow[];
}

// 회원별 참석 상태 맵 (운영진 참석 관리용)
export async function getAttendanceMap(matchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select("member_id, status, source, team_side")
    .eq("match_id", matchId);
  const map: Record<string, { status: "going" | "notGoing" | "undecided"; source: "self" | "manager"; teamSide: "red" | "sky" | null }> = {};
  for (const a of data ?? []) {
    map[a.member_id as string] = {
      status: a.status,
      source: a.source,
      teamSide: a.team_side === "red" || a.team_side === "sky" ? a.team_side : null,
    };
  }
  return map;
}

// 팀 시즌 성적 (자체전 제외, 스코어 입력된 경기, 해당 시즌만 집계)
export async function getTeamStats(season?: number) {
  const y = season ?? yearInSeoul();
  const matches = await getMatches();
  const played = matches.filter(
    (m) =>
      m.type === "match" &&
      m.status !== "cancelled" &&
      m.score_for !== null &&
      m.score_against !== null &&
      new Date(m.match_date + "T00:00:00").getFullYear() === y,
  );
  let win = 0, draw = 0, loss = 0, gf = 0, ga = 0;
  for (const m of played) {
    gf += m.score_for!;
    ga += m.score_against!;
    if (m.score_for! > m.score_against!) win++;
    else if (m.score_for! < m.score_against!) loss++;
    else draw++;
  }
  const count = played.length;
  return { count, win, draw, loss, gf, ga, winRate: count ? Math.round((win / count) * 100) : 0 };
}

// MVP 투표 집계 + 내 투표
export async function getMvpVotes(matchId: string, myMemberId: string | null) {
  const supabase = await createClient();
  const { data } = await supabase.from("mvp_votes").select("voter_id, target_id").eq("match_id", matchId);
  const counts: Record<string, number> = {};
  let myVote: string | null = null;
  for (const v of data ?? []) {
    counts[v.target_id] = (counts[v.target_id] ?? 0) + 1;
    if (myMemberId && v.voter_id === myMemberId) myVote = v.target_id;
  }
  return { counts, myVote, total: data?.length ?? 0 };
}

// 현재 로그인 회원의 이 경기 참석 상태
export async function getMyAttendance(matchId: string, memberId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendances")
    .select("status")
    .eq("match_id", matchId)
    .eq("member_id", memberId)
    .maybeSingle();
  return (data?.status as "going" | "notGoing" | "undecided" | undefined) ?? "undecided";
}
