# 推し活カレンダー

推しのアーティストのライブ、チケット締切、テレビ・ラジオ出演、フードや服のコラボ、グッズ、会員限定イベントをまとめて管理するWebアプリです。黒基調で、スマホのホーム画面に追加してアプリのように使えます。

## できること

- **推しの登録**: 何組でも登録できます。ほかのユーザーが登録した推しをフォローすることもできます（Mrs. GREEN APPLE、テイラー・スウィフト、ドレイクは最初から登録済み）。
- **自動取得**: 3時間ごとに、ニュース検索・テレビ/ラジオ出演の検索・公式サイトのRSSを巡回し、日付のある予定（ライブ、出演、発売、コラボなど）だけを Claude が選んで予定にします。
- **貼り付けで登録**: X・Instagramの投稿、会員メール、お知らせページの文章やURLを貼ると、日時・締切・番組名・出演内容を読み取って入力します。スマホの「共有」ボタンからも開けます。
- **カレンダー・一覧・ホーム**: 次の推しごとまでの日数、締切のリマインド、テレビ・ラジオ出演、コラボ・グッズ・服の欄。推し色で色分けします。
- **参加状況**: 検討中 / 申込済・抽選待ち / チケット確保 / 行く・買う・見る / 見送り。
- **通知**: プッシュ通知、メール、LINE。開始の何日前・何時間前、締切の何時間前かを選べます。
- **カレンダー連携**: 自分専用のURLをGoogleカレンダーやiPhoneのカレンダーに登録すると、予定と締切が自動で反映されます。
- **会員メールの取り込み**: ファンクラブやメルマガのメールを専用アドレスに転送すると、自分だけの予定として登録します。

## 仕組み

| 部分 | 使っているもの |
| --- | --- |
| 画面・サーバー | Next.js 15（App Router） |
| ログイン・データベース | Supabase（メールのログインリンク、Googleログイン、Postgres、行レベルセキュリティ） |
| 告知文の読み取り・ニュースの選別 | Claude API（未設定ならキーワードでの簡易判定） |
| 定期実行 | Vercel Cron（自動取得は3時間ごと、通知は15分ごと） |
| プッシュ通知 | Web Push（VAPID） |
| メール通知 | Resend |
| LINE通知 | LINE Messaging API |

X や Instagram の投稿は、公式APIが有料で制限も厳しいため自動では取りに行きません。投稿のURLや文章を貼り付けて登録してください。Instagramのストーリーズは24時間で消えるので、見つけたらすぐ共有ボタンから登録するのがおすすめです。

## 公開までの手順

### 1. Supabase

1. [Supabase](https://supabase.com/) でプロジェクトを作る。
2. SQL Editor で `supabase/migrations/0001_init.sql`、`0002_seed_artists.sql` の順に実行する。
3. Authentication → URL Configuration の Site URL に公開URL、Redirect URLs に `https://<公開URL>/auth/callback` を追加する。
4. Googleログインを使う場合は Authentication → Providers → Google を有効にする。

### 2. Vercel

1. [Vercel](https://vercel.com/) でこのリポジトリをインポートする。
2. `.env.example` の項目を Environment Variables に設定する。最低限必要なのは Supabase の3つ、`NEXT_PUBLIC_SITE_URL`、`CRON_SECRET` です。
3. デプロイすると `vercel.json` の定期実行が自動で動きます。

### 3. 通知（使うものだけ）

- **プッシュ通知**: `npx web-push generate-vapid-keys` で作った鍵を `NEXT_PUBLIC_VAPID_PUBLIC_KEY` と `VAPID_PRIVATE_KEY` に設定。iPhoneはホーム画面に追加してから開くと使えます。
- **メール**: [Resend](https://resend.com/) のAPIキーを `RESEND_API_KEY` に、送信元を `MAIL_FROM` に設定。
- **LINE**: LINE Developers で Messaging API チャネルを作り、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、友だち追加URL（`NEXT_PUBLIC_LINE_ADD_FRIEND_URL`）を設定。Webhook URL は `https://<公開URL>/api/line/webhook`。ユーザーは設定画面の連携コードをトークで送ると連携されます。

### 4. 会員メールの取り込み（任意）

受信用のドメイン（例: `in.example.com`）でメールを受け、`/api/inbound-mail` に次のJSONをPOSTします。ヘッダー `x-inbound-secret` に `INBOUND_MAIL_SECRET` を入れてください。

```json
{ "to": "u-xxxxxxxxxxxxxxxx@in.example.com", "from": "fc@example.com", "subject": "件名", "text": "本文" }
```

Cloudflare Email Routing（Email Workers）、Postmark Inbound、Resend Inbound などで受けられます。ユーザーは設定画面に表示される自分専用アドレスへ、Gmailの自動転送を設定します。

### 5. Claude API（任意・おすすめ）

`ANTHROPIC_API_KEY` を設定すると、告知文の読み取りとニュースの選別が賢くなります。モデルは `CLAUDE_MODEL` で変えられます（初期値 `claude-opus-5-5`）。

## 開発

```bash
npm install
cp .env.example .env.local   # 値を入れる
npm run dev                  # http://localhost:3000
npm test                     # 日付の読み取り・通知タイミング・RSSのテスト
npm run lint                 # 型チェック
```

定期実行を手元で試すとき:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/collect
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/remind
```
