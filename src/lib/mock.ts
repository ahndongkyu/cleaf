// 목 데이터 — Supabase 연결 전까지 UI 개발용.
// 나중에 lib/data/* 의 실제 조회 함수로 교체.

export type Position = "GK" | "DF" | "MF" | "FW";
export type Role = "member" | "manager" | "admin";

export const POSITION_LABEL: Record<Position, string> = {
  GK: "골키퍼",
  DF: "수비수",
  MF: "미드필더",
  FW: "공격수",
};

// 상세 포지션 코드 → 라벨
export const DETAIL_POSITION_LABEL: Record<string, string> = {
  WF: "윙어",
  CF: "중앙 공격수",
  CAM: "공격형 MF",
  CM: "중앙 MF",
  CDM: "수비형 MF",
  SB: "측면 수비",
  CB: "중앙 수비",
};

export const POSITION_COLOR: Record<Position, string> = {
  GK: "#ef9f27",
  DF: "#3a7bd5",
  MF: "#639922",
  FW: "#e8568a", // 핑크 (PDF 액센트 · GK 골드와 구분)
};

// 포지션 칩 배경/글자 (밝은 배지용)
export const POSITION_BADGE: Record<Position, { bg: string; fg: string }> = {
  GK: { bg: "#faeeda", fg: "#854f0b" },
  DF: { bg: "#e6f1fb", fg: "#0c447c" },
  MF: { bg: "#eaf3de", fg: "#3b6d11" },
  FW: { bg: "#fce4ee", fg: "#b23368" }, // 핑크
};

export type Member = {
  id: string;
  name: string;
  nickname?: string;
  position1: Position;
  position2?: Position;
  role: Role;
  numbers: { uniform: string; number: number }[];
  stats: {
    games: number;
    goals: number;
    assists: number;
    mvp: number;
    attendRate: number; // %
  };
};

export const members: Member[] = [
  { id: "m1", name: "신윙어", nickname: "shin", position1: "FW", position2: "MF", role: "member", numbers: [{ uniform: "빨흰", number: 9 }, { uniform: "스카이", number: 14 }], stats: { games: 18, goals: 14, assists: 3, mvp: 4, attendRate: 90 } },
  { id: "m2", name: "조스트", position1: "FW", role: "manager", numbers: [{ uniform: "빨흰", number: 11 }, { uniform: "스카이", number: 7 }], stats: { games: 17, goals: 9, assists: 5, mvp: 2, attendRate: 85 } },
  { id: "m3", name: "강박스", position1: "MF", position2: "FW", role: "member", numbers: [{ uniform: "빨흰", number: 6 }, { uniform: "스카이", number: 6 }], stats: { games: 19, goals: 7, assists: 8, mvp: 1, attendRate: 95 } },
  { id: "m4", name: "윤윙어", position1: "FW", role: "member", numbers: [{ uniform: "빨흰", number: 17 }, { uniform: "스카이", number: 17 }], stats: { games: 15, goals: 6, assists: 4, mvp: 0, attendRate: 75 } },
  { id: "m5", name: "오플메", position1: "MF", role: "member", numbers: [{ uniform: "빨흰", number: 8 }, { uniform: "스카이", number: 10 }], stats: { games: 18, goals: 4, assists: 9, mvp: 1, attendRate: 90 } },
  { id: "m6", name: "한미드", position1: "MF", role: "member", numbers: [{ uniform: "빨흰", number: 16 }, { uniform: "스카이", number: 16 }], stats: { games: 16, goals: 2, assists: 6, mvp: 0, attendRate: 80 } },
  { id: "m7", name: "정풀백", position1: "DF", role: "manager", numbers: [{ uniform: "빨흰", number: 2 }, { uniform: "스카이", number: 2 }], stats: { games: 18, goals: 3, assists: 5, mvp: 2, attendRate: 90 } },
  { id: "m8", name: "이수비", position1: "DF", role: "member", numbers: [{ uniform: "빨흰", number: 4 }, { uniform: "스카이", number: 4 }], stats: { games: 17, goals: 1, assists: 2, mvp: 0, attendRate: 85 } },
  { id: "m9", name: "박중앙", position1: "DF", role: "member", numbers: [{ uniform: "빨흰", number: 5 }, { uniform: "스카이", number: 5 }], stats: { games: 14, goals: 0, assists: 1, mvp: 0, attendRate: 70 } },
  { id: "m10", name: "최센터", position1: "DF", role: "member", numbers: [{ uniform: "빨흰", number: 3 }, { uniform: "스카이", number: 3 }], stats: { games: 16, goals: 1, assists: 0, mvp: 0, attendRate: 80 } },
  { id: "m11", name: "김골키", position1: "GK", role: "member", numbers: [{ uniform: "빨흰", number: 1 }, { uniform: "스카이", number: 1 }], stats: { games: 18, goals: 0, assists: 0, mvp: 1, attendRate: 90 } },
];

export type Goal = { scorerId: string; assistId?: string };

export type Match = {
  id: string;
  opponent: string;
  date: string; // ISO date
  time: string;
  place: string;
  type: "match" | "self"; // 매치 / 자체전
  uniform?: string;
  status: "upcoming" | "past";
  scoreFor?: number;
  scoreAgainst?: number;
  youtubeUrl?: string;
  goals?: Goal[];
  mvpId?: string;
  attendance: { going: number; notGoing: number; undecided: number };
  myStatus?: "going" | "notGoing" | "undecided";
};

export const matches: Match[] = [
  {
    id: "g1", opponent: "번개FC", date: "2026-07-04", time: "21:00", place: "잠실 보조경기장",
    type: "match", status: "upcoming", uniform: "빨흰",
    attendance: { going: 14, notGoing: 3, undecided: 4 }, myStatus: "going",
  },
  {
    id: "g2", opponent: "자체전 (홍/백)", date: "2026-07-11", time: "21:00", place: "잠실 보조경기장",
    type: "self", status: "upcoming",
    attendance: { going: 6, notGoing: 1, undecided: 10 }, myStatus: "undecided",
  },
  {
    id: "g3", opponent: "FC양천", date: "2026-06-28", time: "21:00", place: "잠실 보조경기장",
    type: "match", status: "past", uniform: "빨흰", scoreFor: 3, scoreAgainst: 1,
    youtubeUrl: "https://youtu.be/example",
    goals: [
      { scorerId: "m1", assistId: "m5" },
      { scorerId: "m1", assistId: "m3" },
      { scorerId: "m2", assistId: "m4" },
    ],
    mvpId: "m1",
    attendance: { going: 14, notGoing: 3, undecided: 1 },
  },
  {
    id: "g4", opponent: "강동유나이티드", date: "2026-06-21", time: "21:00", place: "잠실 보조경기장",
    type: "match", status: "past", scoreFor: 2, scoreAgainst: 2,
    attendance: { going: 13, notGoing: 4, undecided: 0 },
  },
  {
    id: "g5", opponent: "번개FC", date: "2026-06-14", time: "21:00", place: "잠실 보조경기장",
    type: "match", status: "past", scoreFor: 1, scoreAgainst: 2,
    attendance: { going: 12, notGoing: 5, undecided: 0 },
  },
];

export const teamSeason = {
  season: 2026,
  played: 18,
  win: 11,
  draw: 4,
  loss: 3,
  goalsFor: 38,
  goalsAgainst: 19,
  recentForm: ["W", "W", "D", "L", "W"] as ("W" | "D" | "L")[],
};

export function memberById(id: string) {
  return members.find((m) => m.id === id);
}

export function winRate() {
  return Math.round((teamSeason.win / teamSeason.played) * 100);
}
