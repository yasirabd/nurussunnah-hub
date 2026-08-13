import { COLORS, PROMO_GRADIENT } from "./tokens";

/** Slide 1 uses a 58px bar; slides 2-4 use 56px. */
export function PromoBar({ height = 56 }: { height?: number }) {
  const tall = height === 58;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: PROMO_GRADIENT,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: tall ? 16 : 14,
        zIndex: 3,
      }}
    >
      <div
        style={{
          color: COLORS.greenInk,
          fontSize: tall ? 24 : 23,
          fontWeight: 800,
          letterSpacing: tall ? "0.03em" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        SPMB 2027/2028 TELAH DIBUKA
      </div>
      <div
        style={{
          width: 8,
          height: 8,
          background: COLORS.greenInk,
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          color: COLORS.greenInk,
          fontSize: tall ? 24 : 23,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        nurussunnah.sch.id/ppdb
      </div>
    </div>
  );
}
