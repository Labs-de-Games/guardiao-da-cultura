"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EASE_SHRINK } from "./constants";

export type MaskRevealProps = {
  /** Image that becomes visible through the mask as it grows. */
  sceneSrc: string;
  /** Black silhouette PNG used as the alpha mask (opaque = revealed). */
  maskSrc: string;
  /** Mask size at the start, as a fraction of the viewport's longest side. */
  startScale: number;
  /** Mask size at the end. >1 so the mask grows past the viewport. */
  endScale: number;
  durationMs: number;
  /** Called when both the animation completes AND game loading finishes */
  onDone?: () => void;
  /** Called when mask animation starts (to trigger game loading) */
  onAnimationStart?: () => void;
};

/**
 * Screen with an icon-shaped mask that scales from tiny to
 * oversized, revealing the scene image behind it. Shows a loading message
 * and waits for the game to finish loading before calling onDone.
 */
export function MaskReveal({
  sceneSrc,
  maskSrc,
  startScale,
  endScale,
  durationMs,
  onDone,
  onAnimationStart,
}: MaskRevealProps) {
  const [open, setOpen] = useState(false);
  const [dots, setDots] = useState("");
  const [animationDone, setAnimationDone] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);

  // Start animation and notify parent to begin game loading
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      console.log("[DEBUG Flow] MaskReveal: Animation starting");
      setOpen(true);
      onAnimationStart?.();
    });
    const t = window.setTimeout(() => setAnimationDone(true), durationMs + 50);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [durationMs, onAnimationStart]);

  // Listen for game loading completion
  useEffect(() => {
    const handleLoadingComplete = () => {
      console.log("[DEBUG Flow] MaskReveal: phaser-loading-complete received");
      setGameLoaded(true);
    };
    window.addEventListener("phaser-loading-complete", handleLoadingComplete);
    return () => {
      window.removeEventListener(
        "phaser-loading-complete",
        handleLoadingComplete,
      );
    };
  }, []);

  // Call onDone when both animation and loading are complete
  useEffect(() => {
    if (animationDone && gameLoaded) {
      console.log(
        "[DEBUG Flow] MaskReveal: Both animation and loading complete, calling onDone",
      );
      onDone?.();
    }
  }, [animationDone, gameLoaded, onDone]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);
    return () => clearInterval(interval);
  }, []);

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
        backgroundColor: "#000000",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, ...maskStyle }}>
        <Image
          src={sceneSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: "cover",
            display: "block",
            imageRendering: "pixelated",
          }}
        />
      </div>
      {/* Loading message with black glow for visibility on images */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "250px",
            textAlign: "left",
            color: "#D9AD56",
            fontFamily: "Jockey One, sans-serif",
            fontSize: "48px",
            // Black glow effect for text visibility on any background
            textShadow: `
              0 0 8px rgba(0, 0, 0, 1),
              0 0 16px rgba(0, 0, 0, 0.9),
              0 0 24px rgba(0, 0, 0, 0.8),
              0 0 32px rgba(0, 0, 0, 0.7),
              2px 2px 4px rgba(0, 0, 0, 1)
            `,
          }}
          aria-live="polite"
          aria-busy="true"
        >
          Carregando{dots}
        </div>
      </div>
    </div>
  );
}
