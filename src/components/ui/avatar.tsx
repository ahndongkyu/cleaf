import { User, UserPlus } from "lucide-react";

// 기본 프로필 아바타 (사진 대신 사람 아이콘) — 카카오 기본 프로필 느낌
// onDark: 남색 패널(그라데이션 카드) 위에 놓일 때만 지정 — 라이트/다크 공통으로 흰색 계열 유지
// guest=true → 용병용으로 차별화 (점선 테두리 + 앰버톤 + 사람추가 아이콘)
export function Avatar({ size = 34, onDark = false, guest = false }: { size?: number; onDark?: boolean; guest?: boolean }) {
  if (guest) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed"
        style={{ width: size, height: size, background: "#faeeda", borderColor: "#e0b877" }}
      >
        <UserPlus size={Math.round(size * 0.52)} className="text-[#a06a10]" strokeWidth={2} />
      </span>
    );
  }
  if (onDark) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, background: "rgba(255,255,255,0.16)" }}
      >
        <User size={Math.round(size * 0.56)} className="text-white/75" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: "var(--clearfc-surface-3)" }}
    >
      <User size={Math.round(size * 0.56)} style={{ color: "var(--clearfc-avatar-stroke)" }} strokeWidth={2} />
    </span>
  );
}
