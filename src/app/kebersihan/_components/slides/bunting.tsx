import { BUNTING_COLORS } from "./tokens";

export function Bunting() {
  return (
    <div
      style={{
        position: "absolute",
        top: 126,
        left: -8,
        right: -8,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 2,
        pointerEvents: "none",
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.2))",
      }}
    >
      {BUNTING_COLORS.map((color, index) => (
        <div
          key={index}
          style={{
            width: 44,
            height: 36,
            background: color,
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
        />
      ))}
    </div>
  );
}
