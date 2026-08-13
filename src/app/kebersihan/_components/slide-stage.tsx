"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;

/**
 * Scales a 1080x1350 slide down to fit the viewport for preview.
 *
 * The scale lives on a wrapper ABOVE the exported node, never on the node
 * itself. modern-screenshot honours a transform on the node it is given: the
 * slide would render shrunken inside a full 1080x1350 canvas, and the leftover
 * area — transparent, and JPEG has no alpha channel — would come out black.
 *
 * Keeping the inner node at its true 1080x1350 means one node serves both the
 * preview and the export, so what the participant sees is what they get.
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
      setScale(entry.contentRect.width / SLIDE_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div style={{ height: SLIDE_HEIGHT * scale }}>
        <div
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            ref={nodeRef}
            style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
