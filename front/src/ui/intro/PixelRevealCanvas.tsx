"use client";

import { useEffect, useRef } from "react";

export type PixelRevealCanvasProps = {
  src: string;
  width: number;
  height: number;
  revealMs?: number;
  blockSize?: number;
  onDone?: () => void;
  className?: string;
};

/**
 * Pixel-art reveal effect.
 *
 * The image is drawn to an offscreen canvas, divided into a grid of
 * blockSize x blockSize blocks, and revealed in a shuffled random order
 * over revealMs milliseconds. The visible canvas keeps the same px size
 * as the source image, so the result reads as chunky pixels regardless
 * of the rendered CSS size (which the parent controls).
 *
 * The pixelation grid also uses an "ink-burst"-ish bias: blocks whose
 * shuffled index lands early are weighted slightly toward the center,
 * giving a radial-burst feel while still feeling random.
 */
export function PixelRevealCanvas({
  src,
  width,
  height,
  revealMs = 1200,
  blockSize = 8,
  onDone,
  className,
}: PixelRevealCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (cancelled) return;

      // Offscreen canvas holds the fully-drawn image at native size.
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;
      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(img, 0, 0, width, height);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);
      const total = cols * rows;

      // Build the reveal order: weighted shuffle that mildly favors
      // blocks near the center early, for an ink-burst-from-center feel.
      const cx = cols / 2;
      const cy = rows / 2;
      const maxDist = Math.hypot(cx, cy);
      const indices = Array.from({ length: total }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const dist = Math.hypot(col - cx, row - cy) / maxDist; // 0..1
        // jitter dominates; dist nudges ordering slightly
        const key = Math.random() * 0.85 + dist * 0.15;
        return { i, key };
      });
      indices.sort((a, b) => a.key - b.key);

      let drawn = 0;
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / revealMs);
        // Slight ease-out so the last blocks settle gently.
        const eased = 1 - Math.pow(1 - t, 2);
        const target = Math.floor(eased * total);

        while (drawn < target) {
          const { i } = indices[drawn];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * blockSize;
          const y = row * blockSize;
          const w = Math.min(blockSize, width - x);
          const h = Math.min(blockSize, height - y);
          ctx.drawImage(off, x, y, w, h, x, y, w, h);
          drawn++;
        }

        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          onDoneRef.current?.();
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [src, width, height, revealMs, blockSize]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        imageRendering: "pixelated",
        width: width,
        height: height,
        display: "block",
      }}
    />
  );
}
