import type { SlotState } from "../photo-slot";
import { PhotoSlot } from "../photo-slot";
import { BODY_RED, Broom, Bubble, Sparkle, SprayBottle } from "./decorations";
import { PromoBar } from "./promo-bar";
import {
  COLORS,
  FONT_ARABIC,
  FONT_SANS,
  FONT_SERIF_ITALIC,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "./tokens";

const BUBBLE_FILL = "rgba(255,255,255,0.14)";
const BUBBLE_HIGHLIGHT = "rgba(255,255,255,0.75)";

export function SlideHero({
  areaName,
  unitName,
  hero,
}: {
  areaName: string;
  unitName: string;
  hero: SlotState | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: COLORS.green,
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <PhotoSlot slot="hero" state={hero} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(178deg, rgba(8,38,22,0.5) 0%, rgba(8,38,22,0) 20%, rgba(8,38,22,0) 40%, rgba(7,42,24,0.9) 76%, rgba(6,36,20,0.97) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "40px 44px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 104,
              height: 116,
              background: COLORS.cream,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 28px rgba(0,0,0,0.3)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kebersihan/logo.png"
              alt="Yayasan Islam Nurus Sunnah"
              style={{ width: 80, height: "auto", display: "block" }}
            />
          </div>
          <div
            style={{
              color: COLORS.cream,
              textShadow: "0 2px 10px rgba(0,0,0,0.4)",
              fontSize: 25,
              fontWeight: 800,
              lineHeight: 1.25,
              whiteSpace: "nowrap",
            }}
          >
            YAYASAN ISLAM
            <br />
            NURUS SUNNAH
          </div>
        </div>

        <div
          style={{
            background: COLORS.cream,
            padding: "20px 26px",
            borderRadius: 20,
            boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
            transform: "rotate(3deg)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kebersihan/hut81.webp"
            alt="HUT RI ke-81 — Indonesia Berdaulat, Adil dan Makmur"
            style={{ width: 230, height: "auto", display: "block" }}
          />
        </div>
      </div>

      <PromoBar height={58} />

      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 530,
          width: 250,
          height: 400,
          pointerEvents: "none",
          filter:
            "drop-shadow(0 3px 6px rgba(0,0,0,0.35)) drop-shadow(0 16px 26px rgba(0,0,0,0.22))",
        }}
      >
        <Broom
          variant="hero"
          bandColor={COLORS.red}
          style={{
            right: 6,
            top: 70,
            transform: "rotate(9deg) scale(1.15)",
            transformOrigin: "bottom right",
          }}
        />
        <SprayBottle
          variant="hero"
          capColor="#E9CE8F"
          triggerColor="#B98A3F"
          bodyGradient={BODY_RED}
          style={{ left: 44, bottom: 0, transform: "rotate(-7deg)" }}
        />
        <Bubble
          size={56}
          fill={BUBBLE_FILL}
          border="3px solid rgba(255,255,255,0.6)"
          highlight={BUBBLE_HIGHLIGHT}
          style={{ left: 0, top: 80 }}
        />
        <Bubble
          size={32}
          fill={BUBBLE_FILL}
          border="3px solid rgba(255,255,255,0.6)"
          highlight={BUBBLE_HIGHLIGHT}
          style={{ left: 70, top: 20 }}
        />
        <Bubble
          size={20}
          fill={BUBBLE_FILL}
          border="2px solid rgba(255,255,255,0.55)"
          style={{ left: 126, top: 52 }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 60px 104px",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Sparkle
          size={52}
          color={COLORS.goldLight}
          style={{ right: 100, bottom: 660 }}
        />
        <Sparkle
          size={26}
          color="rgba(253,252,248,0.85)"
          style={{ right: 170, bottom: 740 }}
        />
        <Sparkle
          size={18}
          color="rgba(228,200,127,0.7)"
          style={{ right: 80, bottom: 600 }}
        />

        <div style={{ marginBottom: 24, maxWidth: 660 }}>
          <div
            style={{
              color: COLORS.cream,
              fontFamily: FONT_ARABIC,
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.5,
              textShadow: "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            الطُّهُورُ شَطْرُ الْإِيمَانِ
          </div>
          <div
            style={{
              color: "rgba(253,252,248,0.92)",
              fontSize: 24,
              fontStyle: "italic",
              marginTop: 4,
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            “Kesucian (kebersihan) itu separuh dari iman.” — HR. Muslim no. 328
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            background: "rgba(201,162,75,0.18)",
            border: "1px solid rgba(201,162,75,0.6)",
            color: COLORS.goldLight,
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "0.22em",
            padding: "12px 28px",
            borderRadius: 999,
            marginBottom: 26,
            whiteSpace: "nowrap",
          }}
        >
          LOMBA KEBERSIHAN NURUS SUNNAH 2026
        </div>

        <div
          style={{
            color: COLORS.cream,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          BERSIH TEMPATNYA,
        </div>
        <div
          style={{
            color: COLORS.goldLight,
            fontFamily: FONT_SERIF_ITALIC,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 104,
            lineHeight: 1.1,
            marginTop: 4,
          }}
        >
          bangga menjaganya
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 34,
          }}
        >
          <div
            style={{
              width: 64,
              height: 4,
              background: COLORS.gold,
              borderRadius: 2,
              flex: "none",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: COLORS.cream,
                fontSize: 44,
                fontWeight: 700,
                overflowWrap: "anywhere",
              }}
            >
              {areaName}
            </div>
            <div
              style={{
                color: "rgba(253,252,248,0.85)",
                fontSize: 29,
                marginTop: 4,
                overflowWrap: "anywhere",
              }}
            >
              {unitName}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 36,
            borderTop: "1px solid rgba(253,252,248,0.25)",
            paddingTop: 22,
          }}
        >
          <div
            style={{
              color: COLORS.cream,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Cerdas • Mandiri • Berkarakter Qur’ani
          </div>
          <div
            style={{
              color: "rgba(253,252,248,0.75)",
              fontSize: 23,
              fontWeight: 600,
            }}
          >
            @nurussunnah.ig
          </div>
        </div>
      </div>
    </div>
  );
}
