import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PushToggle } from "@/components/push/push-toggle";
import { ThemeToggle } from "@/components/settings/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-lg font-medium text-fg">설정</h1>
        </Link>
      </div>

      <div>
        <div className="mb-2 ml-1 text-xs text-subtle">화면</div>
        <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
          <ThemeToggle />
        </div>
      </div>

      <div>
        <div className="mb-2 ml-1 text-xs text-subtle">알림</div>
        <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
          <PushToggle />
        </div>
      </div>
    </div>
  );
}
