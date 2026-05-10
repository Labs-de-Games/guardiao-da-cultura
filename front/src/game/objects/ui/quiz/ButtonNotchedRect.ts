export type Point = { x: number; y: number };

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
