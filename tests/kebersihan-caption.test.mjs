import assert from "node:assert/strict";
import test from "node:test";
import {
  HASHTAGS,
  instagramCaption,
  instagramCaptionShort,
  whatsappSubmission,
} from "../src/lib/kebersihan/caption.mjs";

const sample = {
  unit: "SMP Islam Nurus Sunnah",
  area: "Laboratorium Komputer",
  members: ["Ahmad", "Fulan", "Fulanah"],
};

test("caption names the area, the unit, and every member", () => {
  const caption = instagramCaption(sample);
  assert.match(caption, /Laboratorium Komputer/);
  assert.match(caption, /SMP Islam Nurus Sunnah/);
  assert.match(caption, /1\. Ahmad/);
  assert.match(caption, /2\. Fulan/);
  assert.match(caption, /3\. Fulanah/);
});

test("caption mentions the official account", () => {
  assert.match(instagramCaption(sample), /@nurussunnah\.ig/);
});

test("caption uses at most five hashtags", () => {
  const caption = instagramCaption(sample);
  const found = caption.match(/#\w+/g) ?? [];
  assert.ok(found.length <= 5, `found ${found.length}`);
  assert.equal(found.length, HASHTAGS.length);
});

test("short caption still lists every member", () => {
  const short = instagramCaptionShort(sample);
  for (const member of sample.members) {
    assert.ok(short.includes(member), `missing ${member}`);
  }
  assert.ok(short.length < instagramCaption(sample).length);
});

test("whatsapp submission carries unit, area, members and link", () => {
  const message = whatsappSubmission({ ...sample, link: "https://instagram.com/p/abc" });
  assert.match(message, /Unit: SMP Islam Nurus Sunnah/);
  assert.match(message, /Area: Laboratorium Komputer/);
  assert.match(message, /1\. Ahmad/);
  assert.match(message, /https:\/\/instagram\.com\/p\/abc/);
});

test("missing link becomes a visible prompt, not a blank line", () => {
  const message = whatsappSubmission({ ...sample, link: "" });
  assert.match(message, /\(tempel link postingan di sini\)/);
});

test("a single member still renders as a numbered list", () => {
  assert.match(instagramCaption({ ...sample, members: ["Ahmad"] }), /1\. Ahmad/);
});

// scripts/seed.mjs in this repo is full of mojibake, so encoding damage is a
// demonstrated risk here rather than a theoretical one. These assert the exact
// code points, which a mangled re-save would break.
test("caption emoji survive as real code points", () => {
  const caption = instagramCaption(sample);
  assert.ok(
    !caption.includes("�"),
    "caption contains a replacement character"
  );
  assert.ok(
    caption.includes("\u{1F1EE}\u{1F1E9}"),
    "Indonesian flag must stay a regional indicator pair"
  );
  assert.ok(caption.includes("\u{1F4CD}"), "location pin missing");
  assert.ok(caption.includes("\u{1F3EB}"), "school emoji missing");
  assert.ok(caption.includes("•"), "bullet separator missing");
  assert.ok(caption.includes("Qur’ani"), "curly apostrophe mangled");
});

test("whatsapp submission emoji survive as real code points", () => {
  const message = whatsappSubmission({ ...sample, link: "" });
  assert.ok(!message.includes("�"));
  assert.ok(message.includes("\u{1F1EE}\u{1F1E9}"), "flag missing");
  assert.ok(message.includes("\u{1F465}"), "people emoji missing");
  assert.ok(message.includes("\u{1F517}"), "link emoji missing");
});

test("caption introduces the team warmly instead of labelling it", () => {
  const caption = instagramCaption(sample);
  assert.match(caption, /Terima kasih/);
  assert.doesNotMatch(caption, /^Anggota area:/m);
});
