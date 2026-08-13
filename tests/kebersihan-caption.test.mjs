import assert from "node:assert/strict";
import test from "node:test";
import {
  HASHTAGS,
  instagramCaption,
  instagramCaptionShort,
  isLikelyInstagramLink,
  whatsappShareUrl,
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
  assert.ok(message.includes("\u{1F3EB}"), "school emoji missing");
  assert.ok(message.includes("\u{1F4CD}"), "location pin missing");
  assert.ok(message.includes("\u{1F465}"), "people emoji missing");
  assert.ok(message.includes("\u{1F517}"), "link emoji missing");
});

test("whatsapp submission avoids flag emoji entirely", () => {
  // Regional-indicator pairs have no glyph on Windows, so WhatsApp Desktop
  // shows the bare letters "ID". Every emoji left in this message exists in
  // Segoe UI Emoji, Noto Color Emoji and Apple Color Emoji alike.
  const message = whatsappSubmission({ ...sample, link: "" });
  assert.doesNotMatch(
    message,
    /[\u{1F1E6}-\u{1F1FF}]/u,
    "submission must not contain a regional indicator"
  );
});

test("whatsapp share url carries the finished message", () => {
  const message = whatsappSubmission({
    ...sample,
    link: "https://instagram.com/p/abc",
  });
  const url = whatsappShareUrl(message);

  assert.ok(url.startsWith("https://wa.me/?text="));
  // No phone number: WhatsApp then lets the participant pick the group.
  assert.doesNotMatch(url, /wa\.me\/\d/);
  assert.equal(decodeURIComponent(url.slice("https://wa.me/?text=".length)), message);
});

test("whatsapp share url escapes newlines and the hash characters", () => {
  const url = whatsappShareUrl("baris satu\nbaris #dua");
  assert.ok(!url.includes("\n"), "raw newline would truncate the message");
  assert.ok(!url.includes("#dua"), "raw # would be read as a URL fragment");
});

test("instagram links are recognised in the shapes people actually paste", () => {
  for (const link of [
    "https://www.instagram.com/p/Cabc123/",
    "https://instagram.com/p/Cabc123/",
    "http://instagram.com/reel/xyz",
    "instagram.com/p/Cabc123/",
  ]) {
    assert.equal(isLikelyInstagramLink(link), true, `should accept ${link}`);
  }
});

test("obvious non-instagram input is flagged", () => {
  for (const link of ["", "   ", "https://facebook.com/p/abc", "belum posting"]) {
    assert.equal(isLikelyInstagramLink(link), false, `should reject "${link}"`);
  }
});

test("caption introduces the team warmly instead of labelling it", () => {
  const caption = instagramCaption(sample);
  assert.match(caption, /Terima kasih/);
  assert.doesNotMatch(caption, /^Anggota area:/m);
});
