"use client";
import { useEffect, useState } from "react";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !key) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => setState((await reg.pushManager.getSubscription()) ? "on" : "off"));
  }, [key]);

  async function enable() {
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key!) });
    await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
    setState("on");
  }
  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading") return <span className="hint">確認中…</span>;
  if (state === "unsupported") return <span className="hint">この端末・ブラウザではプッシュ通知を使えません。iPhoneは「ホーム画面に追加」してから開くと使えます。</span>;
  if (state === "denied") return <span className="hint">通知がブロックされています。ブラウザの設定でこのサイトの通知を許可してください。</span>;
  return state === "on"
    ? <button type="button" className="btn sm" onClick={disable}>この端末のプッシュ通知をオフにする</button>
    : <button type="button" className="btn sm primary" onClick={enable}>この端末でプッシュ通知を受け取る</button>;
}
