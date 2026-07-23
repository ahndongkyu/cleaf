"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronDown, ChevronRight, MapPin, X } from "lucide-react";
import { formatDateKo, dday } from "@/lib/format";
import type { MatchRow } from "@/lib/data/matches";
import { dateInSeoul, yearInSeoul } from "@/lib/date";

const INITIAL_VISIBLE_MONTHS = 3;

function past(m: MatchRow) {
  const today = dateInSeoul();
  return m.status === "cancelled" || m.score_for !== null || m.match_date < today;
}

function resultOf(m: MatchRow) {
  if (m.type === "self") {
    return { label: "자체전", className: "bg-sunken text-muted", barClassName: "bg-subtle" };
  }
  if (m.score_for == null || m.score_against == null) {
    return { label: "기록 전", className: "bg-sunken text-subtle", barClassName: "bg-line" };
  }
  if (m.score_for > m.score_against) {
    return { label: "승", className: "bg-win/10 text-win", barClassName: "bg-win" };
  }
  if (m.score_for < m.score_against) {
    return { label: "패", className: "bg-lose/10 text-lose", barClassName: "bg-lose" };
  }
  return { label: "무", className: "bg-draw/10 text-draw", barClassName: "bg-draw" };
}

function updatePeriodQuery(year: number, month: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("year", String(year));
  if (month === "all") url.searchParams.delete("month");
  else url.searchParams.set("month", month);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function MatchList({
  matches,
  initialYear,
  initialMonth,
}: {
  matches: MatchRow[];
  initialYear: number;
  initialMonth: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [visibleMonthCount, setVisibleMonthCount] = useState(INITIAL_VISIBLE_MONTHS);
  const [periodPicker, setPeriodPicker] = useState<"year" | "month" | null>(null);
  const today = dateInSeoul();
  const currentYear = yearInSeoul();
  const currentMonth = today.slice(5, 7);

  const upcoming = useMemo(
    () => matches.filter((m) => !past(m)).sort((a, b) => a.match_date.localeCompare(b.match_date)),
    [matches],
  );
  const completed = useMemo(
    () => matches.filter(past).sort((a, b) => b.match_date.localeCompare(a.match_date)),
    [matches],
  );

  const years = useMemo(() => {
    const values = new Set(completed.map((m) => Number(m.match_date.slice(0, 4))));
    values.add(yearInSeoul());
    values.add(initialYear);
    return [...values].sort((a, b) => b - a);
  }, [completed, initialYear]);

  const monthCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const m of completed) {
      if (Number(m.match_date.slice(0, 4)) !== year) continue;
      const value = Number(m.match_date.slice(5, 7));
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
  }, [completed, year]);

  const groups = useMemo(() => {
    const filtered = completed.filter((m) => {
      const matchYear = Number(m.match_date.slice(0, 4));
      const matchMonth = m.match_date.slice(5, 7);
      return matchYear === year && (month === "all" || matchMonth === month);
    });
    const result: { key: string; label: string; items: MatchRow[] }[] = [];
    for (const m of filtered) {
      const key = m.match_date.slice(0, 7);
      let group = result.find((g) => g.key === key);
      if (!group) {
        group = { key, label: `${Number(key.slice(5, 7))}월`, items: [] };
        result.push(group);
      }
      group.items.push(m);
    }
    return result;
  }, [completed, month, year]);

  const visibleGroups = month === "all" ? groups.slice(0, visibleMonthCount) : groups;
  const hasMore = month === "all" && visibleGroups.length < groups.length;

  function selectYear(nextYear: number) {
    setYear(nextYear);
    setMonth("all");
    setVisibleMonthCount(INITIAL_VISIBLE_MONTHS);
    updatePeriodQuery(nextYear, "all");
  }

  function selectMonth(nextMonth: string) {
    setMonth(nextMonth);
    setVisibleMonthCount(INITIAL_VISIBLE_MONTHS);
    updatePeriodQuery(year, nextMonth);
  }

  function selectCurrentMonth() {
    setYear(currentYear);
    setMonth(currentMonth);
    setVisibleMonthCount(INITIAL_VISIBLE_MONTHS);
    updatePeriodQuery(currentYear, currentMonth);
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[14px] font-bold text-fg">예정 경기</h2>
            <span className="text-[11px] text-subtle">{upcoming.length}경기</span>
          </div>
          <div className="space-y-2">
            {upcoming.map((m, index) => <UpcomingRow key={m.id} match={m} featured={index === 0} />)}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <PeriodButton label="연도" value={`${year}년`} onClick={() => setPeriodPicker("year")} />
          <PeriodButton label="월" value={month === "all" ? "전체 월" : `${Number(month)}월`} onClick={() => setPeriodPicker("month")} />
          <button
            type="button"
            onClick={selectCurrentMonth}
            className={`flex h-[46px] min-w-0 items-center justify-center rounded-[14px] border px-2 text-[13px] font-extrabold transition-colors ${
              year === currentYear && month === currentMonth
                ? "border-accent bg-accent text-white btn-glow"
                : "border-borderblue bg-card text-accent soft-card"
            }`}
          >
            이번 달
          </button>
        </div>

        {visibleGroups.length === 0 ? (
          <div className="rounded-xl border border-divider bg-card px-4 py-10 text-center text-sm text-muted">
            선택한 기간의 경기가 없어요.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <section key={group.key} className="overflow-hidden rounded-[16px] border border-divider bg-card soft-card">
                <div className="flex items-center justify-between bg-tint px-3.5 py-2.5">
                  <h3 className="text-[13.5px] font-bold text-accent">{group.label}</h3>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-subtle">{group.items.length}경기</span>
                </div>
                <div className="divide-y divide-divider">
                  {group.items.map((m) => <CompletedRow key={m.id} match={m} />)}
                </div>
              </section>
            ))}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleMonthCount((count) => count + INITIAL_VISIBLE_MONTHS)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-card py-2.5 text-[12px] font-bold text-muted"
          >
            이전 경기 더보기 <ChevronDown size={15} />
          </button>
        )}
      </section>

      {periodPicker && (
        <PeriodPicker
          type={periodPicker}
          years={years}
          selectedYear={year}
          selectedMonth={month}
          monthCounts={monthCounts}
          onSelectYear={(value) => {
            selectYear(value);
            setPeriodPicker(null);
          }}
          onSelectMonth={(value) => {
            selectMonth(value);
            setPeriodPicker(null);
          }}
          onClose={() => setPeriodPicker(null)}
        />
      )}
    </div>
  );
}

function UpcomingRow({ match: m, featured }: { match: MatchRow; featured: boolean }) {
  const date = formatDateKo(m.match_date);
  const day = Number(m.match_date.slice(8, 10));
  const title = m.type === "self" ? "자체전" : `vs ${m.opponent}`;

  if (!featured) {
    return (
      <Link href={`/matches/${m.id}`} className="tap flex items-center gap-3 rounded-[16px] border border-borderblue bg-card px-3.5 py-3.5 soft-card">
        <div className="w-10 shrink-0 text-center">
          <div className="text-[18px] font-extrabold leading-none text-fg tabular-nums">{day}</div>
          <div className="mt-1 text-[10px] text-subtle">{Number(m.match_date.slice(5, 7))}월 · {date.weekday}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-fg">{title}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-subtle">
            <Calendar size={11} />
            <span>{m.match_time ?? "시간 미정"}</span>
            {m.place && <><span>·</span><span className="truncate">{m.place}</span></>}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-tint px-2.5 py-1 text-[11px] font-bold text-accent">{dday(m.match_date)}</span>
        <ChevronRight size={15} className="shrink-0 text-faint" />
      </Link>
    );
  }

  return (
    <Link href={`/matches/${m.id}`} className="next-match-card tap block min-h-[148px] p-4.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-extrabold text-white btn-glow">
            다음 경기
          </span>
        </div>
        <span className="rounded-full border border-borderblue bg-card/80 px-3 py-1 text-[12px] font-extrabold text-accent backdrop-blur-sm">
          {dday(m.match_date)}
        </span>
      </div>
      <div className="mt-5 flex items-end gap-4">
        <div className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[17px] border border-borderblue bg-card/75 shadow-sm backdrop-blur-sm">
          <span className="text-[23px] font-black leading-none text-fg tabular-nums">{day}</span>
          <span className="mt-1 text-[10px] font-bold text-accent">{date.weekday}요일</span>
        </div>
        <div className="min-w-0 flex-1 pb-0.5">
          <div className="truncate text-[18px] font-extrabold tracking-[-0.02em] text-fg">{title}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
            <Calendar size={12} className="text-accent" />
            <span>{m.match_time ?? "시간 미정"}</span>
            {m.place && <><span className="text-faint">·</span><MapPin size={12} className="text-accent" /><span className="truncate">{m.place}</span></>}
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card/80 text-accent shadow-sm"><ChevronRight size={17} /></span>
      </div>
    </Link>
  );
}

function CompletedRow({ match: m }: { match: MatchRow }) {
  const date = formatDateKo(m.match_date);
  const day = Number(m.match_date.slice(8, 10));
  const cancelled = m.status === "cancelled";
  const result = resultOf(m);
  const title = m.type === "self" ? "자체전" : `vs ${m.opponent}`;
  const score = m.score_for == null || m.score_against == null ? "-" : `${m.score_for} : ${m.score_against}`;

  return (
    <Link href={`/matches/${m.id}`} className={`relative flex items-center gap-3 overflow-hidden px-3.5 py-3 ${cancelled ? "bg-sunken/50" : ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${cancelled ? "bg-subtle" : result.barClassName}`} aria-hidden />
      <div className="w-9 shrink-0 text-center">
        <div className={`text-[16px] font-extrabold leading-none tabular-nums ${cancelled ? "text-muted" : "text-fg"}`}>{day}</div>
        <div className="mt-1 text-[10px] text-subtle">{date.weekday}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[13.5px] font-bold ${cancelled ? "text-muted" : "text-fg"}`}>{title}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-subtle">
          {m.place ? <><MapPin size={11} /><span className="truncate">{m.place}</span></> : <span>장소 미정</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {cancelled ? (
          <span className="inline-flex rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-extrabold text-muted">경기 취소</span>
        ) : (
          <>
            <div className="text-[15px] font-extrabold text-fg tabular-nums">{score}</div>
            <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${result.className}`}>{result.label}</span>
          </>
        )}
      </div>
      <ChevronRight size={15} className="shrink-0 text-faint" />
    </Link>
  );
}

function PeriodButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={`${label} 선택`} onClick={onClick} className="flex h-[46px] min-w-0 items-center justify-center gap-1.5 rounded-[14px] border border-borderblue bg-card px-2 soft-card">
      <span className="truncate text-[13px] font-extrabold text-fg">{value}</span>
      <ChevronDown size={15} className="shrink-0 text-accent" />
    </button>
  );
}

function PeriodPicker({
  type,
  years,
  selectedYear,
  selectedMonth,
  monthCounts,
  onSelectYear,
  onSelectMonth,
  onClose,
}: {
  type: "year" | "month";
  years: number[];
  selectedYear: number;
  selectedMonth: string;
  monthCounts: Map<number, number>;
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${type === "year" ? "연도" : "월"} 선택`} className="w-full max-w-[480px] rounded-t-[26px] bg-card px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:rounded-[26px]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between px-1">
          <div>
            <div className="text-[16px] font-extrabold text-fg">{type === "year" ? "연도 선택" : "월 선택"}</div>
            <div className="mt-0.5 text-[11px] text-subtle">확인할 경기 기간을 선택하세요</div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-muted"><X size={17} /></button>
        </div>

        {type === "year" ? (
          <div className="mt-5 grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto">
            {years.map((value) => {
              const active = value === selectedYear;
              return (
                <button key={value} type="button" onClick={() => onSelectYear(value)} className={`relative rounded-[14px] border px-3 py-3 text-[13px] font-extrabold ${active ? "border-accent bg-accent text-white btn-glow" : "border-divider bg-sunken text-fg"}`}>
                  {value}년
                  {active && <Check size={13} className="absolute right-2 top-2" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-4 gap-2">
            <button type="button" onClick={() => onSelectMonth("all")} className={`col-span-4 flex items-center justify-between rounded-[14px] border px-4 py-3 text-[13px] font-extrabold ${selectedMonth === "all" ? "border-accent bg-accent text-white btn-glow" : "border-divider bg-sunken text-fg"}`}>
              <span>전체 월</span>
              <span className={`text-[11px] ${selectedMonth === "all" ? "text-white/75" : "text-subtle"}`}>연간 경기 보기</span>
            </button>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => {
              const monthValue = String(value).padStart(2, "0");
              const count = monthCounts.get(value) ?? 0;
              const active = monthValue === selectedMonth;
              return (
                <button key={value} type="button" onClick={() => onSelectMonth(monthValue)} className={`relative rounded-[14px] border py-2.5 text-center ${active ? "border-accent bg-accent text-white btn-glow" : "border-divider bg-sunken text-fg"}`}>
                  <span className="block text-[13px] font-extrabold">{value}월</span>
                  <span className={`mt-0.5 block text-[9.5px] font-medium ${active ? "text-white/70" : "text-subtle"}`}>{count}경기</span>
                  {active && <Check size={11} className="absolute right-1.5 top-1.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
