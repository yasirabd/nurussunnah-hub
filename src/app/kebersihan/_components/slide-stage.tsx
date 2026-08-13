"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Scales a 1080x1350 slide down to fit the viewport for preview.
 *
 * The transform lives on the outer wrapper on purpose: the inner node keeps
 * its real 1080x1350 layout size, so the same node can be handed straight to
 * the rasterizer. One node, one source of truth — what the participant sees is
 * exactly what gets exported.
 */
export function SlideStage({
  children,
  nodeRef,
}: {
  children: ReactNode;
  nodeRef: (node: HTMLDivElement | null) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const element = outerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1080);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div style={{ height: 1350 * scale }}>
        <div
          ref={nodeRef}
          style={{
            width: 1080,
            height: 1350,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
