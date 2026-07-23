// 공용 토스트 — 어디서든 toast("메시지") 호출. Toaster가 받아서 표시.
export function toast(message: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clearfc:toast", { detail: message }));
  }
}
