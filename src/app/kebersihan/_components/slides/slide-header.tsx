import { COLORS } from "./tokens";

/** Slides 2 and 3 stack this at z-index 2; slide 4 needs 3. */
export function SlideHeader({ zIndex = 2 }: { zIndex?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 44px",
        zIndex,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kebersihan/logo.png"
          alt=""
          style={{ width: 64, height: "auto" }}
        />
        <div style={{ color: COLORS.green, fontSize: 23, fontWeight: 700 }}>
          Lomba 5R Nurus Sunnah 2026
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kebersihan/hut81.webp"
        alt="HUT RI ke-81"
        style={{ height: 78, width: "auto" }}
      />
    </div>
  );
}
