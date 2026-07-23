"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function MainError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState reset={reset} />;
}
