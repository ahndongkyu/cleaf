import Link from "next/link";
import {
  AlarmClock,
  ArrowLeft,
  Bell,
  CalendarPlus,
  CircleOff,
  ChevronRight,
  Megaphone,
  Shirt,
  Trophy,
  UserPlus,
} from "lucide-react";
import { getNotifications, type Notif } from "@/lib/data/notifications";
import type { NotificationKind } from "@/lib/notification-events";
import { NotifSeen } from "@/components/layout/notif-seen";

function dateInSeoul(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export default async function NotificationsPage() {
  const notifs = await getNotifications();
  const today = dateInSeoul(new Date());
  const todayNotifs = notifs.filter((notification) => dateInSeoul(notification.at) === today);
  const weekNotifs = notifs.filter((notification) => dateInSeoul(notification.at) !== today);

  return (
    <div className="space-y-5">
      <NotifSeen />
      <div className="mb-6 flex items-baseline gap-2">
        <Link href="/" className="flex items-center gap-2" aria-label="홈으로 돌아가기">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-lg font-medium">알림</h1>
        </Link>
        <span className="text-[11px] text-subtle">최근 7일</span>
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card px-4 py-12 text-center text-[13px] text-muted soft-card">
          <Bell size={22} className="mx-auto mb-2 text-faint" />
          최근 7일 동안 새 알림이 없어요.
        </div>
      ) : (
        <div className="space-y-6">
          {todayNotifs.length > 0 && <NotificationGroup label="오늘" notifications={todayNotifs} />}
          {weekNotifs.length > 0 && <NotificationGroup label="이번 주" notifications={weekNotifs} />}
          <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-subtle">
            <AlarmClock size={13} /> 최근 7일 동안의 알림만 표시됩니다
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationGroup({ label, notifications }: { label: string; notifications: Notif[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 px-0.5">
        <h2 className="text-[13.5px] font-bold text-fg">{label}</h2>
        <span className="text-[11px] text-subtle">{notifications.length}개</span>
      </div>
      <div className="border-t border-divider">
        {notifications.map((notification) => (
          <Link key={notification.id} href={notification.url} className="tap grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-divider px-0.5 py-4">
            <NotificationIcon kind={notification.kind} />
            <span className="min-w-0">
              <span className="flex min-w-0 items-baseline gap-2">
                <strong className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-fg">{notification.title}</strong>
                <time className="shrink-0 text-[10.5px] text-subtle">{timeAgo(notification.at)}</time>
              </span>
              <span className="mt-1 block truncate text-[12px] text-muted">{notification.body}</span>
            </span>
            <ChevronRight size={15} className="text-faint" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  const common = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full";
  if (kind === "notice") {
    return <span aria-label="공지" className={`${common} bg-tint text-accent`}><Megaphone size={17} /></span>;
  }
  if (kind === "match") {
    return <span aria-label="경기 등록" className={common} style={{ color: "var(--vote-going)", background: "color-mix(in srgb, var(--vote-going) 13%, transparent)" }}><CalendarPlus size={17} /></span>;
  }
  if (kind === "reminder") {
    return <span aria-label="경기 알림" className={common} style={{ color: "var(--clearfc-danger)", background: "color-mix(in srgb, var(--clearfc-danger) 13%, transparent)" }}><AlarmClock size={17} /></span>;
  }
  if (kind === "lineup") {
    return <span aria-label="라인업 등록" className={common} style={{ color: "var(--clearfc-pink)", background: "color-mix(in srgb, var(--clearfc-pink) 17%, transparent)" }}><Shirt size={17} /></span>;
  }
  if (kind === "result") {
    return <span aria-label="경기 결과" className={common} style={{ color: "#ef9f27", background: "color-mix(in srgb, #ef9f27 14%, transparent)" }}><Trophy size={17} /></span>;
  }
  if (kind === "cancelled") {
    return <span aria-label="경기 취소" className={common} style={{ color: "var(--clearfc-danger)", background: "color-mix(in srgb, var(--clearfc-danger) 13%, transparent)" }}><CircleOff size={17} /></span>;
  }
  return <span aria-label="가입 신청" className={`${common} bg-sunken text-muted`}><UserPlus size={17} /></span>;
}
