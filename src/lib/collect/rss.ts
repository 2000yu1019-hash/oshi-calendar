import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "../claude";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

export function googleNewsUrl(query: string, lang: "ja" | "en" = "ja") {
  const q = encodeURIComponent(`${query} when:14d`);
  return lang === "ja"
    ? `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`
    : `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

const text = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" && "#text" in v ? String((v as { "#text": unknown })["#text"]) : "");

/** RSS 2.0 / Atom のどちらも読める */
export function parseFeed(xml: string): NewsItem[] {
  const doc = parser.parse(xml);
  const rssItems = doc?.rss?.channel?.item;
  if (rssItems) {
    return (Array.isArray(rssItems) ? rssItems : [rssItems]).map((it) => ({
      title: text(it.title),
      link: text(it.link),
      published: it.pubDate ? new Date(it.pubDate).toISOString() : "",
      source: text(it.source) || "",
    }));
  }
  const entries = doc?.feed?.entry;
  if (entries) {
    return (Array.isArray(entries) ? entries : [entries]).map((e) => {
      const link = Array.isArray(e.link) ? e.link[0] : e.link;
      return {
        title: text(e.title),
        link: link?.["@href"] ?? text(link),
        published: e.updated || e.published ? new Date(e.updated || e.published).toISOString() : "",
        source: text(doc.feed.title),
      };
    });
  }
  return [];
}

export async function fetchFeed(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: { "user-agent": "oshi-calendar/0.1 (+rss reader)" }, cache: "no-store" });
  if (!res.ok) throw new Error(`feed ${res.status}: ${url}`);
  return parseFeed(await res.text());
}
