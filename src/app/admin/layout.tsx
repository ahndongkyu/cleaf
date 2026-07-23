import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (!profile.member_id) redirect("/pending");

  const member = profile.members as { role?: string } | null;
  const isManager = member?.role === "manager" || member?.role === "admin";
  if (!isManager) redirect("/"); // 운영진 아니면 차단

  return <div className="app-shell min-h-dvh px-4 py-4">{children}</div>;
}
