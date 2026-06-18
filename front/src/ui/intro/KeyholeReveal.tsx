"use client";

import { useEffect, useState } from "react";
import { EASE_SHRINK } from "./constants";

export type KeyholeRevealProps = {
  /** Image that becomes visible through the keyhole as it grows. */
  sceneSrc: string;
  /** Black silhouette PNG used as the alpha mask (opaque = revealed). */
  maskSrc: string;
  /** Mask size at the start, as a fraction of the viewport's longest side. */
  startScale: number;
  /** Mask size at the end. >1 so the keyhole grows past the viewport. */
  endScale: number;
  durationMs: number;
  onDone?: () => void;
};

/**
 * Black screen with a keyhole-shaped window that scales from tiny to
 * oversized, revealing the scene image behind it. Once the mask covers the
 * whole viewport, the scene fills the screen and `onDone` fires.
 */
export function KeyholeReveal({
  sceneSrc,
  maskSrc,
  startScale,
  endScale,
  durationMs,
  onDone,
}: KeyholeRevealProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    const t = window.setTimeout(() => onDone?.(), durationMs + 50);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [durationMs, onDone]);

  const scale = open ? endScale : startScale;
  // Size the mask relative to the largest viewport dimension
  const sizePct = scale * 100;

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url(${maskSrc})`,
    maskImage: `url(${maskSrc})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center center",
    maskPosition: "center center",
    WebkitMaskSize: `${sizePct}vmax ${sizePct}vmax`,
    maskSize: `${sizePct}vmax ${sizePct}vmax`,
    transition: `-webkit-mask-size ${durationMs}ms ${EASE_SHRINK}, mask-size ${durationMs}ms ${EASE_SHRINK}`,
    willChange: "mask-size",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "black",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, ...maskStyle }}>
        <img
          src={sceneSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            imageRendering: "pixelated",
          }}
        />
      </div>
    </div>
  );
}
