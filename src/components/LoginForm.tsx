"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setBusy(false);
    setMsg(error ? `送信できませんでした。メールアドレスを確認してください（${error.message}）` : "ログイン用のリンクをメールで送りました。メールを開いてリンクを押してください。");
  }
  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button type="button" className="btn" onClick={google}>Googleで続ける</button>
      <div className="hint" style={{ textAlign: "center" }}>または</div>
      <form className="form" onSubmit={sendLink} style={{ gridTemplateColumns: "1fr" }}>
        <label>メールアドレス<input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <button className="btn primary" disabled={busy}>{busy ? "送信中…" : "ログインリンクを送る"}</button>
      </form>
      {msg && <div className="notice" role="status">{msg}</div>}
    </div>
  );
}
