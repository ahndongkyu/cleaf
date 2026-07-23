import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AppUpdateBanner } from "@/components/layout/app-update-banner";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { ToastFromQuery } from "@/components/ui/toast-from-query";
import { getMyProfile } from "@/lib/data/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login"); // 비로그인
  if (!profile.member_id) redirect("/pending"); // 로그인했으나 승인 전

  return (
    <div className="app-shell flex flex-col">
      <Suspense>
        <ToastFromQuery />
      </Suspense>
      <main className="flex-1 px-4 pb-4 pt-4">
        <PullToRefresh>{children}</PullToRefresh>
      </main>
      <AppUpdateBanner />
      <BottomNav />
    </div>
  );
}
