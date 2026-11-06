export const CATEGORIES = [
  ["live", "ライブ・ツアー"],
  ["ticket", "チケット先行・抽選"],
  ["fc", "FC・会員限定"],
  ["release", "リリース"],
  ["tv", "テレビ出演"],
  ["radio", "ラジオ出演"],
  ["media", "雑誌・Web・その他メディア"],
  ["stream", "配信・SNSライブ"],
  ["food", "フードコラボ"],
  ["fashion", "アパレル・服コラボ"],
  ["goods", "グッズ"],
  ["collab", "その他コラボ・広告"],
  ["event", "握手・サイン会・展示"],
  ["other", "その他"],
] as const;
export type Category = (typeof CATEGORIES)[number][0];
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);
export const COLLAB_CATEGORIES: string[] = ["food", "fashion", "goods", "collab"];
export const BROADCAST_CATEGORIES: string[] = ["tv", "radio"];

export const SOURCES = [
  ["official", "公式サイト"],
  ["x", "X（Twitter）"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["fc", "ファンクラブ"],
  ["mail", "メール会員"],
  ["news", "ニュース"],
  ["tv_guide", "番組表"],
  ["store", "店舗・企業発表"],
  ["other", "その他"],
] as const;
export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(SOURCES);

export const STATUSES = [
  ["", "未定"],
  ["consider", "検討中"],
  ["apply", "申込済・抽選待ち"],
  ["got", "チケット確保"],
  ["go", "行く・買う・見る"],
  ["skip", "見送り"],
] as const;
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUSES);

export const LINK_KINDS = [
  ["official", "公式"],
  ["x", "X"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["fc", "ファンクラブ"],
  ["shop", "公式ショップ"],
] as const;

export const COLORS = ["#ff5fa2", "#ff8a3d", "#ffd23f", "#7be36b", "#3ddbd9", "#4da3ff", "#9b7bff", "#e86bff", "#ff4d4d", "#f5f5f5"];

export const DEADLINE_NAMES = ["申込締切", "入金締切", "当落発表", "予約特典締切", "受注締切", "応募締切", "一般発売"];
