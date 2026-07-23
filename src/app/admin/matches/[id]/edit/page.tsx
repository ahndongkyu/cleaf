import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { getMatch } from "@/lib/data/matches";
import { updateMatch, deleteMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { PlaceSearch } from "@/components/match/place-search";
import { CancelMatchButton } from "@/components/match/cancel-match-button";
import { MatchTimeField } from "@/components/match/match-time-field";
import { getVenues } from "@/lib/data/venues";
import { MatchSetupFields } from "@/components/match/match-setup-fields";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, venues] = await Promise.all([getMatch(id), getVenues()]);
  if (!match) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/matches/${id}`} aria-label="경기 수정 취소" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken">
          <X size={19} />
        </Link>
        <h1 className="text-[17px] font-bold text-fg">경기 수정</h1>
      </div>

      <form id="match-edit-form" action={updateMatch} className="space-y-5">
        <input type="hidden" name="id" value={id} />

        <MatchSetupFields defaultType={match.type} defaultOpponent={match.opponent} defaultUniform={match.uniform ?? ""} />

        <section className="rounded-[18px] border border-borderblue bg-card p-3.5 soft-card">
          <div className="mb-3 text-[15px] font-bold text-fg">일정</div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor="match-date" className="text-[11.5px] font-semibold text-muted">날짜</label>
              <input id="match-date" name="match_date" type="date" required defaultValue={match.match_date} className="input schedule-native-input font-medium tabular-nums" />
            </div>
            <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[11.5px] font-semibold text-muted">시간</span>
              <MatchTimeField defaultTime={match.match_time} />
            </div>
          </div>
        </section>

        <PlaceSearch venues={venues} defaultPlace={match.place ?? ""} defaultAddress={match.place_address ?? ""} defaultLat={match.place_lat} defaultLng={match.place_lng} allowUnspecified defaultUnspecified={!match.place && !match.place_address} variant="section" />

        <Field label="유튜브 영상 URL (선택)">
          <input name="youtube_url" type="url" defaultValue={match.youtube_url ?? ""} placeholder="https://youtu.be/..." className="input" />
        </Field>
      </form>

      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-divider pt-4">
        <ConfirmSubmit form="match-edit-form" message="수정 사항을 저장하시겠습니까?" className="flex w-full items-center justify-center rounded-[10px] border border-red bg-red py-2.5 text-[12px] font-medium text-white">
          수정 저장
        </ConfirmSubmit>
        {match.score_for === null && match.status !== "cancelled" && <CancelMatchButton matchId={id} compact />}
        <form action={deleteMatch}>
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="이 경기를 삭제하시겠습니까? 되돌릴 수 없어요." className="flex w-full items-center justify-center rounded-[10px] border border-danger/40 py-2.5 text-[12px] font-medium text-danger">
            경기 삭제
          </ConfirmSubmit>
        </form>
      </div>
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
