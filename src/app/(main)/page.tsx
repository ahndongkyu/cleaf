import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Calendar, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplet, MapPin, MoonStar, Play, Snowflake, Sun, Wind } from "lucide-react";
import { getMatches, getMyAttendance, isPast, type MatchRow } from "@/lib/data/matches";
import { getHomeMemberStats } from "@/lib/data/stats";
import { getFormation } from "@/lib/data/formations";
import { getMyProfile } from "@/lib/data/auth";
import { getNotifications } from "@/lib/data/notifications";
import { getMatchWeather } from "@/lib/weather";
import { dday, formatDateKo, regionLabel } from "@/lib/format";
import { NextMatchActions } from "@/components/match/next-match-actions";
import { PlaceCopy } from "@/components/match/place-copy";
import { BellButton } from "@/components/layout/bell-button";
import { SwipeSummaryDeck } from "@/components/home/swipe-summary-deck";
import { TeamLogo, TeamWordmark } from "@/components/ui/team-brand";
import { yearInSeoul } from "@/lib/date";

type TeamSummary = { games: number; goals: number; conceded: number; win: number; draw: number; loss: number };

export default async function HomePage() {
  const [matches, profile, notifs] = await Promise.all([getMatches(), getMyProfile(), getNotifications()]);
  const myMemberId = (profile?.member_id as string | null) ?? null;
  const latestNotifAt = notifs[0]?.at ?? null;
  const season = yearInSeoul();
  const myStats = myMemberId ? await getHomeMemberStats(myMemberId, season) : null;

  const upcoming = matches.filter((match) => !isPast(match)).sort((a, b) => a.match_date.localeCompare(b.match_date));
  const next = upcoming[0] ?? null;
  const seasonMatches = matches.filter((match) => match.match_date.startsWith(String(season)) && match.status !== "cancelled" && isPast(match));
  const team = makeTeamSummaries(seasonMatches);
  const latestSelf = matches.find((match) => match.type === "self" && isPast(match) && match.status !== "cancelled" && match.score_for !== null && match.score_against !== null) ?? null;
  const latestMatch = matches.find((match) => match.type === "match" && isPast(match) && match.status !== "cancelled" && match.score_for !== null && match.score_against !== null) ?? null;
  const pastMatches = [latestSelf, latestMatch].filter((match): match is MatchRow => Boolean(match));

  const [myStatus, nextFormation] = await Promise.all([
    next && myMemberId ? getMyAttendance(next.id, myMemberId) : Promise.resolve("undecided" as const),
    next ? getFormation(next.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between px-0.5 pb-1 pt-1">
        <div className="flex items-center gap-2.5">
          <TeamLogo size={40} />
          <TeamWordmark width={104} className="w-[104px]" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-medium text-subtle">{(profile?.members as { name?: string } | null)?.name ?? "회원"}님</span>
          <BellButton latestAt={latestNotifAt} />
        </div>
      </header>

      <SwipeSummaryDeck labels={["전체", "매칭", "자체전"]} dark className="hero-card min-h-[228px]">
        <SeasonOverall season={season} all={team.all} match={team.match} self={team.self} />
        <SeasonMatch season={season} summary={team.match} />
        <SeasonSelf season={season} summary={team.self} />
      </SwipeSummaryDeck>

      {next ? (
        <section className="next-match-card p-4">
          <div className="relative mb-4 flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-fg">다음 경기</span>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-extrabold text-white btn-glow">{dday(next.match_date)}</span>
          </div>
          <Link href={`/matches/${next.id}`} className="relative block">
            <div className="mb-3 flex items-center justify-center gap-5">
              {next.type === "self" ? <SelfTeam tone="red" label="레드" /> : <TeamMark label="CLEAR" />}
              <span className="text-[14px] font-medium text-subtle">VS</span>
              {next.type === "self" ? <SelfTeam tone="blue" label="블루" /> : <TeamMark label={next.opponent} opponent />}
            </div>
            <div className="text-center text-[13px] font-medium text-muted"><Calendar size={14} className="mr-1 inline align-[-2px] text-accent" />{formatDateKo(next.match_date).full}{next.match_time ? ` · ${next.match_time}` : " · 시간 미정"}</div>
            {(next.place_address || next.place) ? <div className="mt-1.5 text-center text-[12px] text-subtle">{next.place_address ? <PlaceCopy place={next.place ?? next.place_address} address={next.place_address} /> : <><MapPin size={13} className="mr-1 inline align-[-2px]" />{next.place}</>}</div> : <div className="mt-1.5 text-center text-[12px] text-subtle"><MapPin size={13} className="mr-1 inline align-[-2px]" />장소 미정</div>}
          </Link>
          <div className="relative mt-3.5"><NextMatchActions matchId={next.id} current={myStatus} hasLineup={!!nextFormation} /></div>
        </section>
      ) : <EmptyNextMatch />}

      {next && <Suspense fallback={<WeatherSkeleton region={regionLabel(next.place_address)} />}><WeatherCard date={next.match_date} time={next.match_time} lat={next.place_lat} lng={next.place_lng} region={regionLabel(next.place_address)} /></Suspense>}

      {myStats && (
        <SwipeSummaryDeck labels={["전체", "매칭", "자체전"]} className="rounded-[20px] border border-borderblue bg-card soft-card">
          <MyRecordOverall season={season} stat={myStats.all} />
          <MyMatchRecord stat={myStats.match} />
          <MySelfRecord stat={myStats.self} />
        </SwipeSummaryDeck>
      )}

      {pastMatches.length > 0 && (
        <SwipeSummaryDeck labels={pastMatches.map((match) => match.type === "self" ? "자체전" : "매칭")} className="rounded-[20px] border border-line bg-card soft-card">
          {pastMatches.map((match) => <LastMatchSlide key={match.id} match={match} />)}
        </SwipeSummaryDeck>
      )}
    </div>
  );
}

function makeTeamSummaries(matches: MatchRow[]) {
  const empty: TeamSummary = { games: 0, goals: 0, conceded: 0, win: 0, draw: 0, loss: 0 };
  const add = (summary: TeamSummary, match: MatchRow) => {
    summary.games++;
    if (match.type === "self") {
      summary.goals += (match.score_for ?? 0) + (match.score_against ?? 0);
    } else {
      const scoreFor = match.score_for ?? 0;
      const scoreAgainst = match.score_against ?? 0;
      summary.goals += scoreFor;
      summary.conceded += scoreAgainst;
      if (scoreFor > scoreAgainst) summary.win++;
      else if (scoreFor < scoreAgainst) summary.loss++;
      else if (match.score_for !== null && match.score_against !== null) summary.draw++;
    }
  };
  const match = { ...empty };
  const self = { ...empty };
  for (const item of matches) add(item.type === "self" ? self : match, item);
  return { all: { games: match.games + self.games, goals: match.goals + self.goals, conceded: match.conceded, win: match.win, draw: match.draw, loss: match.loss }, match, self };
}

function SeasonOverall({ season, all, match, self }: { season: number; all: TeamSummary; match: TeamSummary; self: TeamSummary }) {
  const matchShare = all.games ? Math.round((match.games / all.games) * 100) : 0;
  return <div className="min-h-[228px] px-[22px] pb-9 pt-5"><div className="text-[12px] font-bold" style={{ color: "var(--clearfc-hero-accent)" }}>{season} 시즌 현황</div><div className="mt-4 flex items-end gap-4"><div><div className="text-[42px] font-extrabold leading-none tracking-[-1.5px] tabular-nums" style={{ color: "var(--clearfc-hero-num)" }}>{all.games}</div><div className="mt-1.5 text-[11.5px] text-onpanelmuted">팀 전체 경기</div></div><div className="ml-auto flex gap-2"><HeroChip value={all.goals} label="득점" /><HeroChip value={match.games} label="매칭" /><HeroChip value={self.games} label="자체전" /></div></div><div className="mt-7"><div className="mb-2 flex items-center justify-between text-[11px] font-medium" style={{ color: "var(--clearfc-on-hero-sub)" }}><span>매칭 비중 {matchShare}%</span><span>자체전 비중 {100 - matchShare}%</span></div><div className="flex h-2 overflow-hidden rounded-full border" style={{ background: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.18)" }}><span className="h-full rounded-full" style={{ width: `${matchShare}%`, background: "#78d9bd" }} /></div></div></div>;
}

function SeasonMatch({ season, summary }: { season: number; summary: TeamSummary }) {
  const difference = summary.goals - summary.conceded;
  return <div className="min-h-[228px] px-[22px] pb-9 pt-5"><div className="text-[12px] font-bold" style={{ color: "var(--clearfc-hero-accent)" }}>{season} 매칭 기록</div><div className="mt-4 flex items-end gap-4"><div><div className="text-[42px] font-extrabold leading-none tracking-[-1.5px] tabular-nums" style={{ color: "var(--clearfc-hero-num)" }}>{summary.games}</div><div className="mt-1.5 text-[11.5px] text-onpanelmuted">매칭 경기</div></div><div className="ml-auto flex gap-2"><HeroChip value={summary.win} label="승" /><HeroChip value={summary.draw} label="무" /><HeroChip value={summary.loss} label="패" /></div></div><div className="my-[16px] h-px" style={{ background: "rgba(255,255,255,0.18)" }} /><div className="flex justify-between text-center"><HeroStat value={summary.goals} label="득점" /><HeroDivider /><HeroStat value={summary.conceded} label="실점" /><HeroDivider /><HeroStat value={`${difference >= 0 ? "+" : ""}${difference}`} label="득실차" accent /></div></div>;
}

function SeasonSelf({ season, summary }: { season: number; summary: TeamSummary }) {
  const averageGoals = summary.games ? (summary.goals / summary.games).toFixed(1) : "0.0";
  return <div className="min-h-[228px] px-[22px] pb-9 pt-5"><div className="text-[12px] font-bold" style={{ color: "var(--clearfc-hero-accent)" }}>{season} 자체전 기록</div><div className="mt-5 grid grid-cols-3 divide-x text-center" style={{ borderColor: "var(--clearfc-hero-line)" }}><HeroPanelStat value={summary.games} label="총 자체전" /><HeroPanelStat value={summary.goals} label="총 득점" /><HeroPanelStat value={averageGoals} label="경기당 득점" accent /></div><div className="mt-6 rounded-[14px] px-4 py-3 text-center text-[12px]" style={{ background: "var(--clearfc-hero-chip)", color: "var(--clearfc-on-hero-sub)" }}>레드·블루 팀이 경기마다 달라 실점은 집계하지 않아요</div></div>;
}

function MyRecordOverall({ season, stat }: { season: number; stat: { games: number; attendRate: number; winRate: number; goals: number; assists: number } }) {
  return <div className="min-h-[178px] px-3.5 pb-9 pt-3.5"><span className="absolute inset-x-0 top-0 h-[3px] bg-accent" /><div className="mb-3 flex items-center pr-[84px]"><span className="text-[13px] font-extrabold text-fg">내 기록</span><span className="ml-2 text-[10.5px] font-medium text-subtle">{season} 시즌</span></div><div className="grid grid-cols-3 gap-1"><PersonalTile value={stat.games} label="참여 경기" /><PersonalTile value={stat.goals} label="득점" /><PersonalTile value={stat.assists} label="도움" /></div><div className="my-2.5 h-px bg-divider" /><div className="mx-auto grid max-w-[190px] grid-cols-2 gap-2"><PersonalTile value={`${stat.attendRate}%`} label="참석률" /><PersonalTile value={`${stat.winRate}%`} label="승률" /></div></div>;
}

function MyMatchRecord({ stat }: { stat: { games: number; win: number; draw: number; loss: number; goals: number; assists: number; winRate: number } }) {
  return <div className="min-h-[178px] px-3.5 pb-9 pt-3.5"><span className="absolute inset-x-0 top-0 h-[3px] bg-accent" /><div className="mb-3 flex items-center pr-[84px]"><span className="text-[13px] font-extrabold text-fg">매칭 기록</span></div><div className="grid grid-cols-4 gap-1"><PersonalTile value={stat.games} label="경기 수" /><PersonalTile value={stat.win} label="승" /><PersonalTile value={stat.draw} label="무" /><PersonalTile value={stat.loss} label="패" /></div><div className="my-2.5 h-px bg-divider" /><div className="grid grid-cols-3 gap-1"><PersonalTile value={stat.goals} label="득점" /><PersonalTile value={stat.assists} label="도움" /><PersonalTile value={`${stat.winRate}%`} label="승률" accent /></div></div>;
}

function MySelfRecord({ stat }: { stat: { games: number; win: number; draw: number; loss: number; winRate: number; goals: number; assists: number } }) {
  return <div className="min-h-[178px] px-3.5 pb-9 pt-3.5"><span className="absolute inset-x-0 top-0 h-[3px] bg-accent" /><div className="mb-3 flex items-center pr-[84px]"><span className="text-[13px] font-extrabold text-fg">자체전 기록</span></div><div className="grid grid-cols-4 gap-1"><PersonalTile value={stat.games} label="경기 수" /><PersonalTile value={stat.win} label="승" /><PersonalTile value={stat.draw} label="무" /><PersonalTile value={stat.loss} label="패" /></div><div className="my-2.5 h-px bg-divider" /><div className="grid grid-cols-3 gap-1"><PersonalTile value={stat.goals} label="득점" /><PersonalTile value={stat.assists} label="도움" /><PersonalTile value={`${stat.winRate}%`} label="승률" accent /></div></div>;
}

function LastMatchSlide({ match }: { match: MatchRow }) {
  const self = match.type === "self";
  return <Link href={`/matches/${match.id}`} className="block min-h-[175px] p-3.5 pb-9"><div className="mb-2.5 pr-[80px]"><span className="text-[12.5px] font-bold text-subtle">지난 경기</span></div><div className="mb-3 flex items-start justify-center gap-5">{self ? <SelfTeam tone="red" label="레드" /> : <TeamMark label="CLEAR" />}<span className="flex h-[46px] items-center text-[32px] font-extrabold leading-none tracking-[1px] text-fg tabular-nums">{match.score_for} : {match.score_against}</span>{self ? <SelfTeam tone="blue" label="블루" /> : <TeamMark label={match.opponent} opponent />}</div><div className="text-center text-[11px] font-medium text-subtle">{formatDateKo(match.match_date).short} · {self ? "자체전" : "매칭"}</div><div className="mt-3 flex gap-2"><span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sunken py-2.5 text-[12px] text-faint"><Play size={14} /> 영상 준비중</span><span className="flex flex-1 items-center justify-center rounded-[12px] bg-tint py-2.5 text-[12px] font-bold text-accent">경기 기록</span></div></Link>;
}

function EmptyNextMatch() { return <section className="flex items-center gap-3.5 rounded-[20px] border border-dashed bg-card px-[18px] py-4" style={{ borderColor: "var(--clearfc-dash)" }}><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-tint text-accent"><Calendar size={20} /></span><div><div className="text-[14px] font-bold text-fg">예정된 경기가 없어요</div><div className="mt-0.5 text-[12px] text-subtle">운영진이 경기를 등록하면 여기 표시됩니다</div></div></section>; }
function HeroChip({ value, label }: { value: number; label: string }) { return <div className="w-[52px] rounded-[13px] border py-2.5 text-center" style={{ background: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.16)" }}><div className="text-[18px] font-extrabold leading-none text-white tabular-nums">{value}</div><div className="mt-1 text-[10.5px] text-onpanelmuted">{label}</div></div>; }
function HeroStat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div className="flex-1"><div className="text-[18px] font-extrabold tabular-nums" style={{ color: accent ? "var(--clearfc-pink)" : "#fff" }}>{value}</div><div className="mt-0.5 text-[10.5px] text-onpanelmuted">{label}</div></div>; }
function HeroPanelStat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div><div className="text-[31px] font-extrabold leading-none tracking-[-1px] tabular-nums" style={{ color: accent ? "var(--clearfc-pink)" : "#fff" }}>{value}</div><div className="mt-2 text-[11px] text-onpanelmuted">{label}</div></div>; }
function HeroDivider() { return <div className="w-px" style={{ background: "rgba(255,255,255,0.18)" }} />; }
function PersonalTile({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) { return <div className={`min-w-0 rounded-[11px] px-1 py-2 text-center ${accent ? "bg-tint" : "bg-sunken/70"}`}><div className={`text-[18px] font-extrabold leading-none tabular-nums ${accent ? "text-accent" : "text-fg"}`}>{value}</div><div className={`mt-1.5 text-[10px] font-medium ${accent ? "text-accent" : "text-subtle"}`}>{label}</div></div>; }
function TeamMark({ label, opponent = false }: { label: string; opponent?: boolean }) { return <div className="w-[86px] text-center"><div className={`mx-auto mb-1.5 flex h-11 w-11 items-center justify-center rounded-[13px] text-[10px] font-extrabold ${opponent ? "bg-sunken text-muted" : "brand-logo"}`}>{opponent ? label.slice(0, 2) : <TeamLogo size={34} onDark />}</div><div className="truncate text-[11px] font-bold text-fg">{label}</div></div>; }
function SelfTeam({ tone, label }: { tone: "red" | "blue"; label: string }) { const style = tone === "red" ? { background: "repeating-linear-gradient(90deg, #e95662 0 7px, #fff 7px 14px)", border: "1px solid #f2b3ba" } : { background: "#68b8e8", border: "1px solid #9bd2ef" }; return <div className="w-[58px] text-center"><div className="mx-auto mb-1.5 h-10 w-10 rounded-[12px] shadow-sm" style={style} /><div className="text-[11px] font-bold text-muted">{label}</div></div>; }
function WeatherShell({ date, time, region, children }: { date?: string; time?: string | null; region: string | null; children: ReactNode }) { return <section className="rounded-[20px] border border-line bg-card p-3.5 soft-card"><div className="mb-3 flex items-center justify-between"><span className="text-[13px] text-muted"><Cloud size={15} className="mr-1 inline align-[-2px]" /> {region ?? "경기 날씨"}</span>{date && <span className="text-[11px] text-subtle">{formatDateKo(date).short} {time ?? "시간 미정"}</span>}</div>{children}</section>; }
async function WeatherCard({ date, time, lat, lng, region }: { date: string; time: string | null; lat: number | null; lng: number | null; region: string | null }) { const weather = await getMatchWeather(date, time, lat ?? undefined, lng ?? undefined); return <WeatherShell date={date} time={time} region={region}>{weather ? <div className="flex items-center justify-between"><div className="flex items-center gap-3"><WeatherIcon code={weather.code} hour={weather.hour} /><div><div className="text-[28px] font-bold leading-none text-fg">{weather.temp}°</div><div className="mt-1 text-xs text-muted">체감 {weather.feels}°</div></div></div><div className="flex gap-4 text-center"><WStat icon={<Droplet size={16} className="text-accent" />} v={`${weather.precip}%`} l="강수" /><WStat icon={<Wind size={16} className="text-muted" />} v={`${weather.wind}㎧`} l="바람" /></div></div> : <div className="py-2 text-center text-[12px] text-subtle">경기일이 가까워지면 날씨가 표시돼요</div>}</WeatherShell>; }
function WeatherIcon({ code, hour }: { code: number; hour: number }) { const className = "text-pos-gk"; if (code >= 95) return <CloudLightning size={36} className={className} />; if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={36} className={className} />; if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <Snowflake size={34} className={className} />; if (code === 45 || code === 48) return <CloudFog size={36} className={className} />; if (code === 1 || code === 2) return <CloudSun size={36} className={className} />; if (code === 3) return <Cloud size={36} className={className} />; return hour >= 19 || hour < 6 ? <MoonStar size={36} className={className} /> : <Sun size={36} className={className} />; }
function WeatherSkeleton({ region }: { region: string | null }) { return <WeatherShell region={region}><div className="flex animate-pulse items-center gap-3"><div className="h-9 w-9 rounded-full bg-sunken" /><div className="h-7 w-16 rounded bg-sunken" /></div></WeatherShell>; }
function WStat({ icon, v, l }: { icon: ReactNode; v: string; l: string }) { return <div>{icon}<div className="mt-0.5 text-sm text-fg">{v}</div><div className="text-[10px] text-subtle">{l}</div></div>; }
