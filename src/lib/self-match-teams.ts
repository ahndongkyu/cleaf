type BalancePosition = "GK" | "DF" | "MF" | "FW";

export type BalanceParticipant = {
  id: string;
  name: string;
  position1: BalancePosition;
  teamSide: "red" | "sky" | null;
};

export function makeBalancedTeams<T extends BalanceParticipant>(participants: T[]): T[] {
  const positionOrder: BalancePosition[] = ["GK", "DF", "MF", "FW"];
  const sorted = [...participants].sort(
    (left, right) =>
      positionOrder.indexOf(left.position1) - positionOrder.indexOf(right.position1) ||
      left.name.localeCompare(right.name, "ko"),
  );
  const totals = { red: 0, sky: 0 };
  const positionTotals: Record<BalancePosition, { red: number; sky: number }> = {
    GK: { red: 0, sky: 0 },
    DF: { red: 0, sky: 0 },
    MF: { red: 0, sky: 0 },
    FW: { red: 0, sky: 0 },
  };
  const sideById = new Map<string, "red" | "sky">();

  sorted.forEach((participant, index) => {
    const counts = positionTotals[participant.position1];
    const side = counts.red !== counts.sky
      ? counts.red < counts.sky ? "red" : "sky"
      : totals.red !== totals.sky
        ? totals.red < totals.sky ? "red" : "sky"
        : index % 2 === 0 ? "red" : "sky";
    counts[side] += 1;
    totals[side] += 1;
    sideById.set(participant.id, side);
  });

  return participants.map((participant) => ({
    ...participant,
    teamSide: sideById.get(participant.id) ?? null,
  }));
}
