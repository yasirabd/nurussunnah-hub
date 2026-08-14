import type { SlotState } from "../photo-slot";
import { PhotoSlot } from "../photo-slot";
import { Bunting } from "./bunting";
import { BODY_GREEN, Broom, Bubble, Bucket, Sparkle, SprayBottle } from "./decorations";
import { PromoBar } from "./promo-bar";
import { SlideHeader } from "./slide-header";
import {
  CARD_GRADIENT,
  CARD_SHADOW,
  COLORS,
  FONT_SANS,
  FONT_SERIF_ITALIC,
  PAPER_BACKGROUND,
  PHOTO_FRAME_SHADOW,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./tokens";

export function SlideWide({
  areaName,
  unitName,
  wide,
}: {
  areaName: string;
  unitName: string;
  wide: SlotState | null;
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
      <SlideHeader />
      <Bunting />

      <div
        style={{
          position: "absolute",
          top: 130,
          left: 36,
          right: 36,
          bottom: 340,
          borderRadius: "300px 36px 36px 36px",
          overflow: "hidden",
          border: "3px solid rgba(201,162,75,0.65)",
          boxShadow: PHOTO_FRAME_SHADOW,
        }}
      >
        <PhotoSlot slot="wide" state={wide} />
      </div>

      <Bubble
        size={54}
        border="3px solid rgba(255,255,255,0.65)"
        highlight="rgba(255,255,255,0.8)"
        style={{ top: 180, left: 80, zIndex: 1 }}
      />
      <Bubble
        size={28}
        border="3px solid rgba(255,255,255,0.6)"
        style={{ top: 246, left: 146, zIndex: 1 }}
      />
      <Bubble
        size={18}
        border="2px solid rgba(255,255,255,0.55)"
        style={{ top: 160, left: 170, zIndex: 1 }}
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
          left: 36,
          right: 150,
          bottom: 130,
          background: CARD_GRADIENT,
          borderRadius: 32,
          padding: "44px 52px",
          boxShadow: CARD_SHADOW,
          transform: "rotate(-1deg)",
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
          CERDAS DALAM MENATA
        </div>
        <div
          style={{
            color: COLORS.cream,
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          Ringkas • Rapi •{" "}
          <span
            style={{
              fontFamily: FONT_SERIF_ITALIC,
              fontStyle: "italic",
              fontWeight: 600,
              color: COLORS.goldLight,
            }}
          >
            resik
          </span>
        </div>
        <div
          style={{
            color: "rgba(253,252,248,0.85)",
            fontSize: 27,
            fontWeight: 600,
            marginTop: 18,
            overflowWrap: "anywhere",
          }}
        >
          {areaName} — {unitName}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 52,
          bottom: 80,
          color: COLORS.green,
          fontSize: 23,
          fontWeight: 700,
        }}
      >
        @nurussunnah.ig
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          bottom: 80,
          color: "rgba(11,74,43,0.55)",
          fontSize: 20,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Cerdas • Mandiri • Berkarakter Qur’ani
      </div>

      <PromoBar />

      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 150,
          width: 220,
          height: 360,
          pointerEvents: "none",
          filter:
            "drop-shadow(0 3px 5px rgba(0,0,0,0.22)) drop-shadow(0 14px 22px rgba(0,0,0,0.12))",
          zIndex: 2,
        }}
      >
        <SprayBottle
          capColor={COLORS.green}
          triggerColor="#6E9B82"
          bodyGradient={BODY_GREEN}
          style={{ left: 128, bottom: 8, transform: "rotate(6deg)" }}
        />
        <Broom
          bandColor={COLORS.red}
          style={{ left: 44, top: 0, transform: "rotate(8deg)" }}
        />
        <Bucket style={{ left: 0, bottom: 0 }} />
      </div>

      <Sparkle
        size={48}
        color={COLORS.gold}
        style={{
          right: 80,
          bottom: 400,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
        }}
      />
      <Sparkle size={22} color={COLORS.red} style={{ right: 140, bottom: 360 }} />
      <Sparkle
        size={16}
        color={COLORS.cream}
        style={{
          right: 112,
          bottom: 452,
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))",
        }}
      />
    </div>
  );
}
