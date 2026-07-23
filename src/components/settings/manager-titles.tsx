"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check } from "lucide-react";
import { POSITION_COLOR, type Position } from "@/lib/mock";
import { addManagerTitle, removeManagerTitle, setMemberTitle } from "@/lib/actions/titles";
import { toast } from "@/lib/toast";
import type { ManagerTitle } from "@/lib/data/titles";

type Mgr = { id: string; name: string; position1: string; title: string | null };

export function ManagerTitles({ titles, managers }: { titles: ManagerTitle[]; managers: Mgr[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [, start] = useTransition();

  const add = () => {
    const l = label.trim();
    if (!l) return;
    start(async () => { await addManagerTitle(l); setLabel(""); setAdding(false); router.refresh(); });
  };
  const remove = (id: string, lb: string) => {
    if (!window.confirm(`'${lb}' 역할을 삭제할까요? (부여된 회원도 해제돼요)`)) return;
    start(async () => { await removeManagerTitle(id); router.refresh(); });
  };
  const assign = (memberId: string, title: string) => {
    start(async () => { await setMemberTitle(memberId, title || null); toast("직책이 변경됐어요"); router.refresh(); });
  };

  return (
    <div className="space-y-4">
      {/* 역할 목록 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="ml-1 text-xs text-subtle">역할 목록</div>
          <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1 text-[11px] font-bold text-white">
            <Plus size={12} /> 역할 추가
          </button>
        </div>
        <div className="rounded-xl border border-line bg-card p-3 soft-card">
          {adding && (
            <div className="mb-2.5 flex gap-2">
              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="예: 감독, 총무, 주장"
                className="input flex-1"
              />
              <button onClick={add} className="shrink-0 rounded-lg bg-red px-3 text-[13px] font-bold text-white"><Check size={16} /></button>
            </div>
          )}
          {titles.length === 0 ? (
            <div className="py-1 text-center text-[12px] text-faint">역할을 추가해보세요 (감독·총무·주장 등)</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {titles.map((t) => (
                <span key={t.id} className="flex items-center gap-1.5 rounded-full bg-tint px-3 py-1.5 text-[12.5px] font-bold text-accent">
                  {t.label}
                  <button onClick={() => remove(t.id, t.label)} className="text-accent/60"><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 직책 부여 */}
      <div>
        <div className="mb-2 ml-1 text-xs text-subtle">직책 부여 (운영진)</div>
        <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
          {managers.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-subtle">운영진이 없어요.</div>
          ) : (
            managers.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < managers.length - 1 ? "border-b border-divider" : ""}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: POSITION_COLOR[m.position1 as Position] ?? "#889" }}>{m.name.slice(0, 1)}</span>
                <span className="flex-1 text-[13px] font-medium">{m.name}</span>
                <select value={m.title ?? ""} onChange={(e) => assign(m.id, e.target.value)} className="rounded-lg border border-line bg-sunken px-2.5 py-1.5 text-[12px]">
                  <option value="">직책 없음</option>
                  {titles.map((t) => <option key={t.id} value={t.label}>{t.label}</option>)}
                </select>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
