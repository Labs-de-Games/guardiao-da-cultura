"use client";

import { useEffect, useRef } from "react";

export type PixelDissolveCanvasProps = {
  src: string;
  width: number;
  height: number;
  dissolveMs?: number;
  blockSize?: number;
  onDone?: () => void;
  className?: string;
};

/**
 * Reverse of PixelRevealCanvas: starts fully drawn, then clears the image
 * one randomly-ordered block at a time over `dissolveMs`. Produces the
 * same chunky pixel aesthetic as the reveal, just in reverse.
 */
export function PixelDissolveCanvas({
  src,
  width,
  height,
  dissolveMs = 1200,
  blockSize = 8,
  onDone,
  className,
}: PixelDissolveCanvasProps) {
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
    let finished = false;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      onDoneRef.current?.();
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    const begin = () => {
      if (cancelled) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);
      const total = cols * rows;

      // Bias clearing slightly toward edges first (inverse of reveal's
      // center-burst), giving a feeling of the image dissolving inward.
      const cx = cols / 2;
      const cy = rows / 2;
      const maxDist = Math.hypot(cx, cy);
      const indices = Array.from({ length: total }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const dist = Math.hypot(col - cx, row - cy) / maxDist;
        const key = Math.random() * 0.85 + (1 - dist) * 0.15;
        return { i, key };
      });
      indices.sort((a, b) => a.key - b.key);

      let cleared = 0;
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / dissolveMs);
        const eased = 1 - (1 - t) ** 2;
        const target = Math.floor(eased * total);
        while (cleared < target) {
          const { i } = indices[cleared];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * blockSize;
          const y = row * blockSize;
          const w = Math.min(blockSize, width - x);
          const h = Math.min(blockSize, height - y);
          ctx.clearRect(x, y, w, h);
          cleared++;
        }
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          finish();
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    img.onload = begin;
    img.onerror = finish;
    img.src = src;

    if (img.complete) {
      if (img.naturalWidth > 0) {
        begin();
      } else {
        finish();
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [src, width, height, dissolveMs, blockSize]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        imageRendering: "pixelated",
        width,
        height,
        display: "block",
      }}
    />
  );
}
