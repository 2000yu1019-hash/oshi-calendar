import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminders } from "../src/lib/notify/remind.ts";
import type { EventRow } from "../src/lib/types.ts";

const base: EventRow = {
  id: "e1", artist_ids: ["a1"], title: "東京公演", category: "live", start_at: "2026-11-01T09:00:00Z", end_at: null, all_day: false,
  venue: "東京ドーム", url: null, source: "official", fc_only: false, memo: null, broadcast: null,
  deadlines: [{ label: "入金締切", at: "2026-10-28T14:59:00Z" }], owner_id: null, is_public: false, origin: "auto", verified: false, external_id: null,
};
const prof = { remind_before_start: [1440, 60], remind_before_deadline: [1440, 180] };

test("1日前の通知時刻を過ぎたら通知する", () => {
  const due = dueReminders([base], prof, () => "ミセス", new Date("2026-10-31T09:05:00Z"));
  assert.deepEqual(due.map((d) => d.key), ["e1:start:1440"]);
  assert.match(due[0].msg.title, /1日前/);
});

test("締切の3時間前", () => {
  const due = dueReminders([base], prof, () => "ミセス", new Date("2026-10-28T12:00:00Z"));
  assert.deepEqual(due.map((d) => d.key), ["e1:dl0:180"]);
});

test("終わった予定や古すぎる通知は出さない", () => {
  assert.equal(dueReminders([base], prof, () => "", new Date("2026-11-02T00:00:00Z")).length, 0);
  // 1日前の通知時刻から7時間後（6時間を過ぎた）では出さない
  assert.equal(dueReminders([{ ...base, deadlines: [] }], prof, () => "", new Date("2026-10-31T16:00:00Z")).length, 0);
});
