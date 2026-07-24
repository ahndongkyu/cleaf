import test from "node:test";
import assert from "node:assert/strict";
import { makeBalancedTeams } from "../src/lib/self-match-teams.ts";
import type { Position } from "../src/lib/positions.ts";

const participants = [
  ["1", "골키퍼1", "GK"],
  ["2", "골키퍼2", "GK"],
  ["3", "수비1", "DF"],
  ["4", "수비2", "DF"],
  ["5", "수비3", "DF"],
  ["6", "미드1", "MF"],
  ["7", "미드2", "MF"],
  ["8", "미드3", "MF"],
  ["9", "공격1", "FW"],
  ["10", "공격2", "FW"],
  ["11", "용병", "FW"],
].map(([id, name, position1]) => ({
  id,
  name,
  position1: position1 as Position,
  teamSide: null,
}));

test("자체전 참석자를 양 팀에 한 명 차이 이내로 배정한다", () => {
  const result = makeBalancedTeams(participants);
  const red = result.filter((participant) => participant.teamSide === "red");
  const blue = result.filter((participant) => participant.teamSide === "sky");
  assert.ok(Math.abs(red.length - blue.length) <= 1);
  assert.equal(result.some((participant) => participant.teamSide === null), false);
});

test("같은 포지션도 양 팀에 한 명 차이 이내로 배정한다", () => {
  const result = makeBalancedTeams(participants);
  for (const position of ["GK", "DF", "MF", "FW"] as Position[]) {
    const red = result.filter((participant) => participant.position1 === position && participant.teamSide === "red").length;
    const blue = result.filter((participant) => participant.position1 === position && participant.teamSide === "sky").length;
    assert.ok(Math.abs(red - blue) <= 1, `${position} 배정이 불균형합니다.`);
  }
});

test("같은 참석자 목록은 항상 같은 결과를 만든다", () => {
  assert.deepEqual(makeBalancedTeams(participants), makeBalancedTeams(participants));
});
