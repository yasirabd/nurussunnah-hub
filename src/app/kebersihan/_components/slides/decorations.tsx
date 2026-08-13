import type { CSSProperties } from "react";

// Ornaments ported verbatim from the official design source at
// docs/superpowers/reference/twibbon-lomba-kebersihan-v2.html. Each one is a
// stack of absolutely-positioned divs; only the colours and the wrapper
// placement differ between slides, so those are props and everything else is
// fixed geometry.

const SPARKLE_PATH =
  "polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%)";

const HANDLE_GRADIENT = "linear-gradient(180deg,#D9B36A,#B98A3F)";

const STRAW_TEXTURE =
  "linear-gradient(100deg, rgba(120,75,20,0.3), rgba(255,255,255,0.32) 45%, rgba(120,75,20,0.32)), repeating-linear-gradient(90deg, rgba(140,95,30,0.35) 0 5px, transparent 5px 13px)";

export const BODY_RED = "linear-gradient(100deg,#D23A42,#B7212A 50%,#8C161D)";
export const BODY_GREEN = "linear-gradient(100deg,#3E9663,#2E7D4F 50%,#1F5A38)";

const BUCKET_BODY = "linear-gradient(100deg,#D23A42,#B7212A 45%,#8C161D)";

const MIST_COLOR = "#A8D3E8";

export function Sparkle({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        background: color,
        clipPath: SPARKLE_PATH,
        ...style,
      }}
    />
  );
}

export function Bubble({
  size,
  border,
  fill = "rgba(255,255,255,0.16)",
  highlight,
  style,
}: {
  size: number;
  border: string;
  fill?: string;
  highlight?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: fill,
        border,
        pointerEvents: "none",
        ...style,
      }}
    >
      {highlight ? (
        <div
          style={{
            position: "absolute",
            left: "18%",
            top: "14%",
            width: "26%",
            height: "26%",
            borderRadius: "50%",
            background: highlight,
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Slide 1's broom is drawn slightly larger than the rest, so its handle, band
 * and head sit a few pixels lower. Slide 3 swaps the solid straw head for four
 * separate bristles.
 */
export function Broom({
  variant = "standard",
  bandColor,
  head = "solid",
  style,
}: {
  variant?: "hero" | "standard";
  bandColor: string;
  head?: "solid" | "bristles";
  style?: CSSProperties;
}) {
  const hero = variant === "hero";
  const wrapperHeight = hero ? 300 : 290;
  const handleHeight = hero ? 190 : 186;
  const bandTop = hero ? 186 : 182;
  const headTop = hero ? 204 : 200;
  const headHeight = hero ? 88 : 86;

  return (
    <div
      style={{ position: "absolute", width: 96, height: wrapperHeight, ...style }}
    >
      <div
        style={{
          position: "absolute",
          left: 42,
          top: 0,
          width: 11,
          height: handleHeight,
          background: HANDLE_GRADIENT,
          borderRadius: 6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          top: bandTop,
          width: 47,
          height: 20,
          background: bandColor,
          borderRadius: 5,
        }}
      />
      {head === "solid" ? (
        <div
          style={{
            position: "absolute",
            left: 6,
            top: headTop,
            width: 83,
            height: headHeight,
            background: "#E9CE8F",
            clipPath: "polygon(28% 0, 72% 0, 100% 100%, 0 100%)",
            backgroundImage: STRAW_TEXTURE,
          }}
        />
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 200,
              width: 12,
              height: 88,
              background: "#E9CE8F",
              borderRadius: 6,
              transform: "rotate(4deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 32,
              top: 202,
              width: 12,
              height: 96,
              background: "#F4E3B8",
              borderRadius: 6,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 48,
              top: 200,
              width: 12,
              height: 90,
              background: "#E9CE8F",
              borderRadius: 6,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 64,
              top: 202,
              width: 12,
              height: 94,
              background: "#F4E3B8",
              borderRadius: 6,
              transform: "rotate(-4deg)",
            }}
          />
        </>
      )}
    </div>
  );
}

export function SprayBottle({
  variant = "standard",
  capColor,
  triggerColor,
  bodyGradient,
  style,
}: {
  variant?: "hero" | "standard";
  capColor: string;
  triggerColor: string;
  bodyGradient: string;
  style?: CSSProperties;
}) {
  const hero = variant === "hero";
  const mist = hero
    ? [
        { left: 70, top: -10, size: 9 },
        { left: 80, top: 2, size: 6 },
        { left: 73, top: 12, size: 7 },
      ]
    : [
        { left: 70, top: -8, size: 8 },
        { left: 79, top: 3, size: 6 },
        { left: 72, top: 12, size: 7 },
      ];

  return (
    <div style={{ position: "absolute", width: 80, height: 132, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 0,
          width: 36,
          height: 18,
          background: capColor,
          borderRadius: 5,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 4,
          width: 14,
          height: 9,
          background: capColor,
          borderRadius: "0 4px 4px 0",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 6,
          top: 16,
          width: 12,
          height: 26,
          background: capColor,
          clipPath: "polygon(100% 0, 100% 100%, 0 70%, 0 25%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 18,
          width: 14,
          height: 18,
          background: triggerColor,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 10,
          top: 34,
          width: 46,
          height: 86,
          background: bodyGradient,
          borderRadius: 14,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 17,
          top: 56,
          width: 32,
          height: 30,
          background: hero ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.85)",
          borderRadius: 6,
        }}
      />
      {mist.map((dot, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: MIST_COLOR,
          }}
        />
      ))}
    </div>
  );
}

export function Bucket({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", width: 76, height: 104, ...style }}>
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 0,
          width: 60,
          height: 34,
          border: "6px solid #801A1F",
          borderBottom: "none",
          borderRadius: "34px 34px 0 0",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 26,
          width: 76,
          height: 78,
          background: BUCKET_BODY,
          clipPath: "polygon(4% 0, 96% 0, 84% 100%, 16% 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 56,
          width: 60,
          height: 14,
          background: "#FDFCF8",
          clipPath: "polygon(0 0, 100% 0, 98% 100%, 2% 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 20,
          width: 76,
          height: 14,
          background: "#801A1F",
          borderRadius: 7,
        }}
      />
    </div>
  );
}
