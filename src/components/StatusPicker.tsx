"use client";
import { useOptimistic, useTransition } from "react";
import { setStatus } from "@/app/actions";
import { STATUSES } from "@/lib/constants";

export function StatusPicker({ eventId, status }: { eventId: string; status: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(status);
  return (
    <div className="seg" role="group" aria-label="参加状況" aria-busy={pending}>
      {STATUSES.map(([k, l]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => start(async () => { setValue(k); await setStatus(eventId, k); })}>{l}</button>
      ))}
    </div>
  );
}
