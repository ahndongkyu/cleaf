"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { PlaceSearch } from "@/components/match/place-search";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { addVenue, removeVenue, updateVenue } from "@/lib/actions/venues";
import type { Venue } from "@/lib/data/venues";
import { toast } from "@/lib/toast";

export function VenueManager({ venues }: { venues: Venue[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addFormVersion, setAddFormVersion] = useState(0);

  async function handleAdd(formData: FormData) {
    const result = await addVenue(formData);
    toast(result.message);
    if (result.ok) setAddFormVersion((value) => value + 1);
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] text-muted">등록 경기장</h2>
          <p className="mt-0.5 text-[11px] text-subtle">일정 등록 시 장소명으로 검색할 수 있어요.</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-[10px] bg-accent px-2.5 py-2 text-[12px] font-semibold text-white">
            <Plus size={14} />추가
          </button>
        )}
      </div>

      {adding && (
        <form action={handleAdd} className="mb-3 space-y-3 rounded-[16px] border border-borderblue bg-card p-3.5 soft-card">
          <div className="text-[13px] font-bold text-fg">새 경기장</div>
          <PlaceSearch key={addFormVersion} requirePlace requireAddress />
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" className="rounded-[11px] bg-accent py-2.5 text-[13px] font-bold text-white">경기장 등록</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-[11px] border border-divider py-2.5 text-[13px] font-semibold text-muted">닫기</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {venues.length === 0 && !adding && (
          <div className="rounded-[14px] border border-dashed border-borderblue px-4 py-6 text-center text-[12px] text-subtle">등록된 경기장이 없어요.</div>
        )}
        {venues.map((venue) => editingId === venue.id ? (
          <form key={venue.id} action={updateVenue} className="space-y-3 rounded-[16px] border border-borderblue bg-card p-3.5 soft-card">
            <input type="hidden" name="id" value={venue.id} />
            <PlaceSearch defaultPlace={venue.name} defaultAddress={venue.address} defaultLat={venue.lat} defaultLng={venue.lng} requirePlace requireAddress />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setEditingId(null)} className="rounded-[10px] border border-divider py-2.5 text-[12px] text-muted">취소</button>
              <button type="submit" className="rounded-[10px] bg-accent py-2.5 text-[12px] font-bold text-white">저장</button>
            </div>
          </form>
        ) : (
          <div key={venue.id} className="rounded-[14px] border border-divider bg-card p-3.5 soft-card">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent"><MapPin size={16} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-fg">{venue.name}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-subtle">{venue.address}</div>
              </div>
              <button type="button" aria-label={`${venue.name} 수정`} onClick={() => setEditingId(venue.id)} className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-divider text-muted"><Pencil size={14} /></button>
              <form action={removeVenue}>
                <input type="hidden" name="id" value={venue.id} />
                <ConfirmSubmit message={`${venue.name} 경기장을 삭제하시겠습니까?`} className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-danger/30 text-danger"><Trash2 size={14} /></ConfirmSubmit>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
