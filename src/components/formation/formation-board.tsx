"use client";

import { useEffect, useRef, useState } from "react";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { Share2, Users, Save } from "lucide-react";
import { members, memberById, POSITION_COLOR } from "@/lib/mock";
import { HOME_UNIFORM } from "@/lib/uniforms";
import { Pitch } from "./pitch";

type Pos = { x: number; y: number };

// 선발 11명 (GK, DF×4, MF×3, FW×3)
const STARTERS = ["m11", "m8", "m9", "m10", "m7", "m3", "m5", "m6", "m1", "m2", "m4"];

const PRESETS: Record<string, Pos[]> = {
  "4-3-3": [
    { x: 50, y: 90 },
    { x: 18, y: 72 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 82, y: 72 },
    { x: 28, y: 50 }, { x: 50, y: 46 }, { x: 72, y: 50 },
    { x: 22, y: 24 }, { x: 50, y: 18 }, { x: 78, y: 24 },
  ],
  "4-4-2": [
    { x: 50, y: 90 },
    { x: 16, y: 72 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 72 },
    { x: 16, y: 48 }, { x: 38, y: 50 }, { x: 62, y: 50 }, { x: 84, y: 48 },
    { x: 38, y: 22 }, { x: 62, y: 22 },
  ],
  "4-2-3-1": [
    { x: 50, y: 90 },
    { x: 18, y: 74 }, { x: 40, y: 76 }, { x: 60, y: 76 }, { x: 82, y: 74 },
    { x: 36, y: 58 }, { x: 64, y: 58 },
    { x: 22, y: 38 }, { x: 50, y: 36 }, { x: 78, y: 38 },
    { x: 50, y: 18 },
  ],
  "3-5-2": [
    { x: 50, y: 90 },
    { x: 30, y: 74 }, { x: 50, y: 76 }, { x: 70, y: 74 },
    { x: 14, y: 54 }, { x: 34, y: 52 }, { x: 50, y: 50 }, { x: 66, y: 52 }, { x: 86, y: 54 },
    { x: 38, y: 22 }, { x: 62, y: 22 },
  ],
};

function presetPositions(name: string): Record<string, Pos> {
  const coords = PRESETS[name];
  const out: Record<string, Pos> = {};
  STARTERS.forEach((id, i) => {
    out[id] = { ...coords[i] };
  });
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function FormationBoard() {
  const [preset, setPreset] = useState("4-3-3");
  const [positions, setPositions] = useState<Record<string, Pos>>(() => presetPositions("4-3-3"));
  const [mounted, setMounted] = useState(false);
  const pitchRef = useRef<HTMLDivElement>(null);

  // dnd-kit는 SSR 시 aria id 불일치가 생겨서, 마운트 후에만 드래그 활성화
  useEffect(() => setMounted(true), []);

  function applyPreset(name: string) {
    setPreset(name);
    setPositions(presetPositions(name));
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPositions((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          x: clamp(cur.x + (e.delta.x / rect.width) * 100, 4, 96),
          y: clamp(cur.y + (e.delta.y / rect.height) * 100, 4, 96),
        },
      };
    });
  }

  const benchIds = members.map((m) => m.id).filter((id) => !STARTERS.includes(id));

  const pitch = (
    <div ref={pitchRef} className="relative w-full select-none">
      <Pitch />
      <div className="absolute inset-0">
        {STARTERS.map((id) =>
          mounted ? (
            <DraggableChip key={id} id={id} pos={positions[id]} />
          ) : (
            <StaticChip key={id} id={id} pos={positions[id]} />
          ),
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-navy text-[13px] font-medium text-[#5dcaa5]">
            CL
          </div>
          <div>
            <div className="text-sm font-medium">vs 번개FC</div>
            <div className="text-[11px] text-subtle">7월 4일 · {preset}</div>
          </div>
        </div>
        <button aria-label="이미지로 공유" className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line">
          <Share2 size={17} />
        </button>
      </div>

      {/* 프리셋 */}
      <div className="flex gap-1.5 overflow-x-auto">
        {Object.keys(PRESETS).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            className={`shrink-0 rounded-[20px] px-3 py-1.5 text-xs ${
              preset === name ? "bg-[#1b5e20] text-white" : "border border-line bg-card text-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 피치 */}
      {mounted ? (
        <DndContext id="clearfc-formation" onDragEnd={onDragEnd}>
          {pitch}
        </DndContext>
      ) : (
        pitch
      )}

      {/* 벤치 / 저장 */}
      <div className="flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-[13px]">
          <Users size={16} /> 벤치 ({benchIds.length})
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-[13px]">
          <Save size={16} /> 저장
        </button>
      </div>
    </div>
  );
}

function ChipVisual({ id }: { id: string }) {
  const m = memberById(id);
  if (!m) return null;
  const color = POSITION_COLOR[m.position1];
  const num = m.numbers.find((n) => n.uniform === HOME_UNIFORM)?.number ?? m.numbers[0]?.number;
  return (
    <>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[13px] font-medium text-white shadow-md"
        style={{ background: color }}
      >
        {num}
      </div>
      <span className="mt-0.5 text-[10px] text-white" style={{ textShadow: "0 1px 2px #000" }}>
        {m.name}
      </span>
    </>
  );
}

function StaticChip({ id, pos }: { id: string; pos: Pos }) {
  if (!pos) return null;
  return (
    <div
      style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
      className="flex flex-col items-center"
    >
      <ChipVisual id={id} />
    </div>
  );
}

function DraggableChip({ id, pos }: { id: string; pos: Pos }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  if (!pos) return null;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: `translate(-50%, -50%) translate3d(${transform?.x ?? 0}px, ${transform?.y ?? 0}px, 0)`,
        touchAction: "none",
        zIndex: isDragging ? 30 : 10,
      }}
      className="flex cursor-grab flex-col items-center active:cursor-grabbing"
    >
      <ChipVisual id={id} />
    </div>
  );
}
