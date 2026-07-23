import Link from "next/link";
import { X } from "lucide-react";
import { createMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { PlaceSearch } from "@/components/match/place-search";
import { MatchTimeField } from "@/components/match/match-time-field";
import { getVenues } from "@/lib/data/venues";
import { MatchSetupFields } from "@/components/match/match-setup-fields";

export default async function NewMatchPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const venues = await getVenues();

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/matches" aria-label="경기 등록 취소" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken">
          <X size={19} />
        </Link>
        <h1 className="text-[17px] font-bold text-fg">경기 등록</h1>
      </div>

      <form action={createMatch} className="space-y-5">
        <MatchSetupFields />

        <section className="rounded-[18px] border border-borderblue bg-card p-3.5 soft-card">
          <div className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-fg">
            일정
          </div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor="match-date" className="text-[11.5px] font-semibold text-muted">날짜</label>
              <input id="match-date" name="match_date" type="date" required defaultValue={today} className="input schedule-native-input font-medium tabular-nums" />
            </div>
            <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[11.5px] font-semibold text-muted">시간</span>
              <MatchTimeField />
            </div>
          </div>
        </section>

        <PlaceSearch venues={venues} allowUnspecified variant="section" />

        <Field label="유튜브 영상 URL (선택)">
          <input name="youtube_url" type="url" placeholder="https://youtu.be/..." className="input" />
        </Field>

        <ConfirmSubmit message="이 경기를 등록하시겠습니까?" className="btn-glow w-full rounded-[13px] bg-accent py-3.5 text-sm font-bold text-white">경기 등록</ConfirmSubmit>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[11.5px] font-semibold text-muted">{label}</div>
      {children}
    </div>
  );
}
