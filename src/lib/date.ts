const SEOUL_TIME_ZONE = "Asia/Seoul";

export function dateInSeoul(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function yearInSeoul(now: Date = new Date()) {
  return Number(dateInSeoul(now).slice(0, 4));
}
