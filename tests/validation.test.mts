import test from "node:test";
import assert from "node:assert/strict";
import {
  boundedText,
  isIsoDate,
  isTime,
  optionalCoordinate,
  optionalBoundedText,
  optionalHttpsUrl,
  uniformNumber,
} from "../src/lib/validation.ts";
import { dateInSeoul, yearInSeoul } from "../src/lib/date.ts";

test("텍스트 길이와 공백을 검증한다", () => {
  assert.equal(boundedText("  CLEAR  ", 10), "CLEAR");
  assert.equal(boundedText("", 10), null);
  assert.equal(boundedText("12345", 4), null);
  assert.equal(optionalBoundedText("", 4), null);
  assert.equal(optionalBoundedText("12345", 4), undefined);
});

test("실제 달력 날짜와 시간을 검증한다", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isTime("23:59"), true);
  assert.equal(isTime("24:00"), false);
});

test("HTTPS URL과 좌표 범위를 검증한다", () => {
  assert.equal(optionalHttpsUrl("https://youtu.be/example"), "https://youtu.be/example");
  assert.equal(optionalHttpsUrl("javascript:alert(1)"), undefined);
  assert.equal(optionalCoordinate("37.5", -90, 90), 37.5);
  assert.equal(optionalCoordinate("181", -180, 180), undefined);
});

test("등번호는 0부터 99까지의 정수만 허용한다", () => {
  assert.equal(uniformNumber("0"), 0);
  assert.equal(uniformNumber("99"), 99);
  assert.equal(uniformNumber("-1"), undefined);
  assert.equal(uniformNumber("1.5"), undefined);
});

test("연도 경계에서도 서울 날짜를 사용한다", () => {
  const instant = new Date("2025-12-31T15:30:00.000Z");
  assert.equal(dateInSeoul(instant), "2026-01-01");
  assert.equal(yearInSeoul(instant), 2026);
});
