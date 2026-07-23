import Link from "next/link";
import { X } from "lucide-react";
import { createMember } from "@/lib/actions/members";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { PositionSelect } from "@/components/member/position-select";
import { AWAY_UNIFORM, HOME_UNIFORM } from "@/lib/uniforms";

export default function NewMemberPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/members">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">회원 등록</h1>
      </div>

      <form action={createMember} className="space-y-4">
        <Field label="이름">
          <input name="name" required placeholder="홍길동" className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm" />
        </Field>

        <PositionSelect />

        <Field label="유니폼별 등번호">
          <div className="flex flex-col gap-2">
            <NumberRow uniform={HOME_UNIFORM} color="#e83d4f" />
            <NumberRow uniform={AWAY_UNIFORM} color="#1976c9" />
          </div>
        </Field>

        <Field label="권한">
          <Select name="role" options={[{ v: "member", label: "회원" }, { v: "manager", label: "운영진" }]} />
        </Field>

        <ConfirmSubmit message="이 회원을 등록하시겠습니까?" className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">
          회원 등록
        </ConfirmSubmit>
        <p className="text-center text-[11px] leading-relaxed text-subtle">
          등록 후 회원이 카카오 로그인하면
          <br />
          운영진이 승인·연결합니다.
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      {children}
    </div>
  );
}

function Select({ name, options }: { name: string; options: { v: string; label: string }[] }) {
  return (
    <select name={name} className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm">
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberRow({ uniform, color, border }: { uniform: string; color: string; border?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2">
      <span
        className="h-4 w-4 rounded-full"
        style={border ? { background: "#fff", border: `2px solid ${color}` } : { background: color }}
      />
      <span className="flex-1 text-[13px]">{uniform}</span>
      <input
        name={`number_${uniform}`}
        type="number"
        inputMode="numeric"
        placeholder="번호"
        className="w-16 rounded-md border border-line bg-sunken px-2 py-1.5 text-center text-sm"
      />
    </div>
  );
}
