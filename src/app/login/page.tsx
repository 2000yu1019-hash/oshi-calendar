import { LoginForm } from "@/components/LoginForm";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="view" style={{ maxWidth: 440, margin: "0 auto" }}>
      <div className="card" style={{ display: "grid", gap: 16 }}>
        <h1 style={{ fontSize: 22 }}>ログイン・新規登録</h1>
        <p className="hint" style={{ margin: 0 }}>はじめての方も同じ手順で登録できます。パスワードは不要です。</p>
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
