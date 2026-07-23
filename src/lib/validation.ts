export const LIMITS = {
  name: 40,
  shortText: 120,
  comment: 1_000,
  matchComment: 300,
  noticeTitle: 120,
  noticeContent: 20_000,
} as const;

export function boundedText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text && text.length <= maxLength ? text : null;
}

export function optionalBoundedText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.length <= maxLength ? text : undefined;
}

export function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function optionalHttpsUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function optionalCoordinate(value: unknown, min: number, max: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}

export function uniformNumber(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) && number >= 0 && number <= 99 ? number : undefined;
}
