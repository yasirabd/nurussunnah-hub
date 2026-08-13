// Every value here is copied verbatim from the official design source at
// docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html. Repeated values
// live here so the four slides cannot drift apart.

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export const COLORS = {
  green: "#0B4A2B",
  greenDeep: "#083A21",
  greenLift: "#11663C",
  greenInk: "#0B3A21",
  cream: "#FDFCF8",
  gold: "#C9A24B",
  goldLight: "#E4C87F",
  goldTop: "#D9B564",
  goldDeep: "#B08A38",
  red: "#B7212A",
} as const;

export const CARD_GRADIENT =
  "linear-gradient(145deg,#11663C 0%,#0B4A2B 55%,#083A21 100%)";

export const CARD_SHADOW =
  "0 26px 60px rgba(11,74,43,0.38), 0 6px 14px rgba(11,74,43,0.22), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.06)";

export const PROMO_GRADIENT =
  "linear-gradient(180deg,#D9B564,#C9A24B 45%,#B08A38)";

export const PAPER_BACKGROUND =
  "radial-gradient(circle at 88% 6%, rgba(201,162,75,0.14), transparent 26%), radial-gradient(circle at 4% 96%, rgba(11,74,43,0.1), transparent 30%), repeating-linear-gradient(135deg, rgba(11,74,43,0.05) 0 2px, transparent 2px 28px)";

export const PHOTO_FRAME_SHADOW =
  "0 18px 44px rgba(11,74,43,0.16), 0 4px 10px rgba(11,74,43,0.1)";

export const BUNTING_COLORS = Array.from({ length: 24 }, (_, i) =>
  i % 2 ? COLORS.cream : COLORS.red
);

export const FONT_SANS = "var(--font-jakarta), sans-serif";
export const FONT_SERIF_ITALIC = "var(--font-lora), serif";
export const FONT_ARABIC = "var(--font-amiri), serif";
