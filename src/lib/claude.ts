import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES, SOURCES } from "./constants";
import { heuristicDraft } from "./heuristics";
import type { EventDraft } from "./types";
import { ymd } from "./dates";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const catKeys = CATEGORIES.map((c) => c[0]) as [string, ...string[]];
const srcKeys = SOURCES.map((s) => s[0]) as [string, ...string[]];

const DraftSchema = z.object({
  title: z.string(),
  artist: z.string(),
  category: z.enum(catKeys),
  source: z.enum(srcKeys),
  start: z.string(),
  end: z.string(),
  venue: z.string(),
  url: z.string(),
  fc_only: z.boolean(),
  deadlines: z.array(z.object({ label: z.string(), at: z.string() })),
  station: z.string(),
  program: z.string(),
  segment: z.string(),
  memo: z.string(),
});

const RULES = `カテゴリ: ${CATEGORIES.map(([k, l]) => `${k}=${l}`).join(", ")}
情報源: ${SOURCES.map(([k, l]) => `${k}=${l}`).join(", ")}
日時は日本時間の "YYYY-MM-DDTHH:MM" で書く。海外の現地時間で書かれていれば日本時間に直す。年がなければ今日以降で最も近い日付にする。時刻が不明なら "T00:00"。
テレビ・ラジオは station(局名), program(番組名), segment(コーナーや出演内容) を埋める。
ミスドなど食べ物とのコラボは food、服やブランドとのコラボは fashion。
わからない値は空文字。`;

function client() {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

/** 貼り付けられた告知文（SNS投稿・メール・Web）から予定を1件読み取る */
export async function parseAnnouncement(text: string, artistNames: string[]): Promise<{ draft: EventDraft; by: "claude" | "simple" }> {
  const c = client();
  if (!c) return { draft: heuristicDraft(text, artistNames), by: "simple" };
  try {
    const res = await c.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(DraftSchema) },
      system: `あなたは推し活の予定を整理するアシスタントです。告知文から予定を1件だけ読み取ります。\n${RULES}`,
      messages: [{ role: "user", content: `今日は ${ymd(new Date())}。登録済みのアーティスト: ${artistNames.join("、") || "なし"}\n\n<announcement>\n${text}\n</announcement>` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("no output");
    return { draft: res.parsed_output, by: "claude" };
  } catch (e) {
    console.error("parseAnnouncement failed", e);
    return { draft: heuristicDraft(text, artistNames), by: "simple" };
  }
}

const NewsSchema = z.object({
  items: z.array(
    z.object({
      index: z.number(),
      relevant: z.boolean(),
      draft: DraftSchema,
    }),
  ),
});

export type NewsItem = { title: string; link: string; published: string; source: string };

/**
 * ニュース見出しのうち、日時のある予定（ライブ・出演・発売・コラボなど）だけを予定に変換する。
 * 単なる話題記事やランキング記事は relevant=false にする。
 */
export async function classifyNews(artistName: string, items: NewsItem[]): Promise<{ item: NewsItem; draft: EventDraft }[]> {
  const c = client();
  if (!c || items.length === 0) return [];
  const list = items.map((it, i) => `[${i}] ${it.title}（${it.source}, ${it.published}）`).join("\n");
  try {
    const res = await c.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(NewsSchema) },
      system: `あなたは「${artistName}」のファン向けに、ニュース見出しから予定を拾うアシスタントです。
見出しに予定の日付（またはそこから確実にわかる日付）があり、ファンが参加・視聴・購入できるもの（ライブ、チケット、テレビ・ラジオ出演、リリース、コラボ商品、グッズ、イベント）だけ relevant=true にします。
本人と関係ない記事、過去の出来事の報告、感想や話題だけの記事は relevant=false。
${RULES}`,
      messages: [{ role: "user", content: `今日は ${ymd(new Date())}。\n<headlines>\n${list}\n</headlines>` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return [];
    return res.parsed_output.items
      .filter((x) => x.relevant && items[x.index] && x.draft.start)
      .map((x) => ({ item: items[x.index], draft: { ...x.draft, url: x.draft.url || items[x.index].link, source: "news" } }));
  } catch (e) {
    console.error("classifyNews failed", e);
    return [];
  }
}
