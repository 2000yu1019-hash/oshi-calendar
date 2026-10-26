import { test } from "node:test";
import assert from "node:assert/strict";
import { googleNewsUrl, parseFeed } from "../src/lib/collect/rss.ts";

test("Googleニュース形式のRSSを読む", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
  <item><title>Mrs. GREEN APPLE、12月のMステに出演 - 音楽ナタリー</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Mon, 26 Oct 2026 03:00:00 GMT</pubDate><source url="https://natalie.mu">音楽ナタリー</source></item>
  <item><title>別の記事</title><link>https://news.google.com/rss/articles/def</link><pubDate>Sun, 25 Oct 2026 03:00:00 GMT</pubDate><source url="https://example.com">Example</source></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 2);
  assert.equal(items[0].source, "音楽ナタリー");
  assert.equal(items[0].published, "2026-10-26T03:00:00.000Z");
});

test("Atomも読める", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><title>公式ニュース</title><entry><title>ツアー決定</title><link href="https://example.com/news/1"/><updated>2026-10-20T00:00:00Z</updated></entry></feed>`;
  const items = parseFeed(xml);
  assert.deepEqual(items[0], { title: "ツアー決定", link: "https://example.com/news/1", published: "2026-10-20T00:00:00.000Z", source: "公式ニュース" });
});

test("日本語の検索URL", () => {
  assert.match(googleNewsUrl('"ドレイク"'), /hl=ja&gl=JP/);
});
