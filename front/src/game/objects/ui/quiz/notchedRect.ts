export type Point = { x: number; y: number };

/**
 * Returns points for a rectangle with small left/right "notches".
 * Points are ordered around the perimeter for Phaser.Graphics.fillPoints(..., true).
 */
export function getNotchedRectPoints(
  centerX: number,
  centerY: number,
  halfW: number,
  halfH: number,
  notchDepth: number,
  notchHeight: number,
): Point[] {
  return [
    { x: centerX - halfW + notchDepth, y: centerY - halfH },
    {
      x: centerX - halfW + notchDepth,
      y: centerY - halfH + notchHeight,
    },
    { x: centerX - halfW, y: centerY - halfH + notchHeight },
    { x: centerX - halfW, y: centerY + halfH - notchHeight },
    {
      x: centerX - halfW + notchDepth,
      y: centerY + halfH - notchHeight,
    },
    { x: centerX - halfW + notchDepth, y: centerY + halfH },
    { x: centerX + halfW - notchDepth, y: centerY + halfH },
    {
      x: centerX + halfW - notchDepth,
      y: centerY + halfH - notchHeight,
    },
    { x: centerX + halfW, y: centerY + halfH - notchHeight },
    { x: centerX + halfW, y: centerY - halfH + notchHeight },
    {
      x: centerX + halfW - notchDepth,
      y: centerY - halfH + notchHeight,
    },
    { x: centerX + halfW - notchDepth, y: centerY - halfH },
  ];
}
