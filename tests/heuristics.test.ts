import { test } from "node:test";
import assert from "node:assert/strict";
import { findDates, guessCategory, heuristicDraft } from "../src/lib/heuristics.ts";

const now = new Date("2026-10-26T10:00:00+09:00");

test("日付と時刻を読み取る", () => {
  assert.deepEqual(findDates("11/30(日) 18:00開演", now), ["2026-11-30T18:00"]);
  assert.deepEqual(findDates("2027年1月5日 19時", now), ["2027-01-05T19:00"]);
});

test("年のない過去の日付は来年にする", () => {
  assert.deepEqual(findDates("2/14 発売", now), ["2027-02-14T00:00"]);
});

test("カテゴリを推測する", () => {
  assert.equal(guessCategory("ミスタードーナツとのコラボが決定"), "food");
  assert.equal(guessCategory("TOKYO FM の番組にゲスト出演"), "radio");
  assert.equal(guessCategory("Mステに生出演"), "tv");
  assert.equal(guessCategory("ユニクロとのコラボTシャツ"), "fashion");
});

test("告知文から下書きを作る", () => {
  const d = heuristicDraft("【FC先行】Mrs. GREEN APPLE ツアー 11/30(日)18:00\n受付 11/1 12:00〜11/8 23:59\nhttps://x.com/abc", ["Mrs. GREEN APPLE"], now);
  assert.equal(d.artist, "Mrs. GREEN APPLE");
  assert.equal(d.source, "x");
  assert.equal(d.fc_only, true);
  assert.equal(d.start, "2026-11-30T18:00");
  assert.equal(d.deadlines[0].at, "2026-11-08T23:59");
});
