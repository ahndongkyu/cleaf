export type Position = "GK" | "DF" | "MF" | "FW";
export type Role = "member" | "manager" | "admin";

export const POSITION_LABEL: Record<Position, string> = {
  GK: "골키퍼",
  DF: "수비수",
  MF: "미드필더",
  FW: "공격수",
};

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
  FW: "#e8568a",
};

export const POSITION_BADGE: Record<Position, { bg: string; fg: string }> = {
  GK: { bg: "#faeeda", fg: "#854f0b" },
  DF: { bg: "#e6f1fb", fg: "#0c447c" },
  MF: { bg: "#eaf3de", fg: "#3b6d11" },
  FW: { bg: "#fce4ee", fg: "#b23368" },
};
