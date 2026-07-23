"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Users, BarChart3, Menu } from "lucide-react";

const tabs = [
  { href: "/", label: "홈", icon: Home, exact: true },
  { href: "/matches", label: "매치", icon: CalendarDays },
  { href: "/members", label: "멤버", icon: Users },
  { href: "/stats", label: "기록", icon: BarChart3 },
  { href: "/more", label: "더보기", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-nav sticky bottom-0 z-20">
      <ul className="mx-auto flex max-w-[480px] items-center justify-around px-2 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className="flex flex-col items-center gap-1 px-3 py-1.5" aria-current={active ? "page" : undefined}>
                <Icon size={22} className={active ? "text-accent" : "text-faint"} strokeWidth={active ? 2.4 : 2} />
                <span className={`text-[10px] ${active ? "font-bold text-accent" : "text-faint"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
