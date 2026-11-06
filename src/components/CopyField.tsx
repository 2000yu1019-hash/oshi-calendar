"use client";
import { useState } from "react";

export function CopyField({ value, id }: { value: string; id: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy">
      <input id={id} readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="コピーする内容" />
      <button type="button" className="btn sm" onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }
        catch { (document.getElementById(id) as HTMLInputElement | null)?.select(); }
      }}>{done ? "コピーしました" : "コピー"}</button>
    </div>
  );
}
