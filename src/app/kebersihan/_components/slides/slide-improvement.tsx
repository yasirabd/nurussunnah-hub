import type { CSSProperties } from "react";
import type { SlotState } from "../photo-slot";
import { PhotoSlot } from "../photo-slot";
import { Bunting } from "./bunting";
import { BODY_RED, Broom, Bubble, Bucket, Sparkle, SprayBottle } from "./decorations";
import { PromoBar } from "./promo-bar";
import { SlideHeader } from "./slide-header";
import {
  CARD_GRADIENT,
  CARD_SHADOW,
  COLORS,
  FONT_SANS,
  FONT_SERIF_ITALIC,
  PAPER_BACKGROUND,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./tokens";

const PILL_BASE: CSSProperties = {
  position: "absolute",
  color: "#fff",
  fontSize: 23,
  fontWeight: 800,
  letterSpacing: "0.2em",
  padding: "12px 26px",
  borderRadius: 999,
  zIndex: 2,
  pointerEvents: "none",
};

export function SlideImprovement({
  areaName,
  unitName,
  before,
  after,
}: {
  areaName: string;
  unitName: string;
  before: SlotState | null;
  after: SlotState | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: COLORS.cream,
        backgroundImage: PAPER_BACKGROUND,
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      <SlideHeader zIndex={3} />
      <Bunting />

      <div
        style={{
          position: "absolute",
          top: 150,
          left: 40,
          width: 620,
          height: 440,
          transform: "rotate(-2deg)",
          borderRadius: 28,
          overflow: "hidden",
          border: "3px solid rgba(201,162,75,0.5)",
          boxShadow:
            "0 16px 40px rgba(20,20,20,0.18), 0 4px 10px rgba(20,20,20,0.12)",
        }}
      >
        <PhotoSlot slot="before" state={before} />
      </div>
      <div
        style={{
          ...PILL_BASE,
          top: 208,
          left: 76,
          background: "rgba(20,20,20,0.8)",
          transform: "rotate(-2deg)",
        }}
      >
        SEBELUM
      </div>

      <div
        style={{
          position: "absolute",
          top: 510,
          left: 300,
          width: 740,
          height: 450,
          transform: "rotate(1.5deg)",
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 24px 56px rgba(11,74,43,0.28)",
          border: "6px solid #C9A24B",
          zIndex: 1,
        }}
      >
        <PhotoSlot slot="after" state={after} />
      </div>
      <div
        style={{
          ...PILL_BASE,
          top: 538,
          left: 334,
          background: COLORS.green,
          transform: "rotate(1.5deg)",
        }}
      >
        SESUDAH
      </div>

      <PromoBar />

      <div
        style={{
          position: "absolute",
          left: 36,
          top: 600,
          width: 240,
          height: 370,
          pointerEvents: "none",
          filter:
            "drop-shadow(0 3px 5px rgba(0,0,0,0.2)) drop-shadow(0 14px 22px rgba(0,0,0,0.1))",
          zIndex: 2,
        }}
      >
        <Broom
          bandColor={COLORS.red}
          style={{ left: 12, top: 60, transform: "rotate(-7deg)" }}
        />
        <SprayBottle
          capColor={COLORS.green}
          triggerColor="#6E9B82"
          bodyGradient={BODY_RED}
          style={{ left: 110, bottom: 44, transform: "rotate(6deg)" }}
        />
        <Bucket style={{ left: 170, bottom: 40 }} />
        <Bubble
          size={44}
          fill="rgba(11,74,43,0.08)"
          border="3px solid rgba(11,74,43,0.35)"
          highlight="rgba(11,74,43,0.3)"
          style={{ left: 150, top: 0 }}
        />
        <Bubble
          size={24}
          fill="rgba(11,74,43,0.08)"
          border="2px solid rgba(11,74,43,0.3)"
          style={{ left: 206, top: 44 }}
        />
      </div>

      <Bubble
        size={48}
        border="3px solid rgba(255,255,255,0.65)"
        highlight="rgba(255,255,255,0.8)"
        style={{ top: 190, left: 100, zIndex: 2 }}
      />
      <Sparkle
        size={46}
        color={COLORS.gold}
        style={{
          top: 230,
          right: 100,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.2))",
          pointerEvents: "none",
        }}
      />
      <Sparkle
        size={20}
        color={COLORS.red}
        style={{ top: 180, right: 170, pointerEvents: "none" }}
      />
      <Bubble
        size={34}
        fill="rgba(11,74,43,0.08)"
        border="3px solid rgba(11,74,43,0.32)"
        highlight="rgba(11,74,43,0.3)"
        style={{ top: 300, right: 160 }}
      />
      <Bubble
        size={18}
        fill="rgba(11,74,43,0.08)"
        border="2px solid rgba(11,74,43,0.28)"
        style={{ top: 350, right: 110 }}
      />
      <Bubble
        size={44}
        border="3px solid rgba(255,255,255,0.65)"
        highlight="rgba(255,255,255,0.8)"
        style={{ top: 580, right: 90, zIndex: 2 }}
      />
      <Bubble
        size={22}
        border="2px solid rgba(255,255,255,0.55)"
        style={{ top: 636, right: 150, zIndex: 2 }}
      />

      <div
        style={{
          position: "absolute",
          top: 44,
          left: 620,
          width: 14,
          height: 14,
          background: COLORS.gold,
          borderRadius: 3,
          transform: "rotate(22deg)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 86,
          left: 680,
          width: 11,
          height: 11,
          background: COLORS.red,
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 742,
          width: 12,
          height: 12,
          background: COLORS.green,
          borderRadius: 3,
          transform: "rotate(-18deg)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom: 110,
          background: CARD_GRADIENT,
          borderRadius: 32,
          padding: "38px 52px",
          boxShadow: CARD_SHADOW,
        }}
      >
        <div
          style={{
            color: COLORS.goldLight,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.2em",
            marginBottom: 12,
          }}
        >
          RAWAT & RAJIN
        </div>
        <div
          style={{
            color: COLORS.cream,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        >
          Kami menjaga,{" "}
          <span
            style={{
              fontFamily: FONT_SERIF_ITALIC,
              fontStyle: "italic",
              fontWeight: 600,
              color: COLORS.goldLight,
            }}
          >
            bukan hanya membersihkan
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            marginTop: 20,
            borderTop: "1px solid rgba(253,252,248,0.25)",
            paddingTop: 18,
          }}
        >
          <div
            style={{
              color: "rgba(253,252,248,0.85)",
              fontSize: 24,
              fontWeight: 600,
              overflowWrap: "anywhere",
            }}
          >
            {areaName} — {unitName}
          </div>
          <div
            style={{
              color: COLORS.goldLight,
              fontSize: 22,
              fontWeight: 700,
              flex: "none",
            }}
          >
            @nurussunnah.ig
          </div>
        </div>
      </div>

      <Sparkle
        size={48}
        color={COLORS.gold}
        style={{
          left: 130,
          top: 680,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
        }}
      />
      <Sparkle size={22} color={COLORS.red} style={{ left: 196, top: 730 }} />
      <Sparkle size={16} color={COLORS.green} style={{ left: 100, top: 640 }} />
    </div>
  );
}
