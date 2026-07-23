// 탭 이동 시 즉시 표시되는 스켈레톤 (서버 렌더 대기 동안 멈춘 느낌 제거)
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-3 pt-1">
        <div className="h-11 w-11 rounded-[14px] bg-sunken" />
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded bg-sunken" />
          <div className="h-3 w-16 rounded bg-sunken" />
        </div>
      </div>
      <div className="h-28 rounded-[20px] bg-sunken" />
      <div className="h-40 rounded-[20px] bg-sunken" />
      <div className="h-24 rounded-[20px] bg-sunken" />
    </div>
  );
}
