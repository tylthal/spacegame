export interface Vector2 {
  x: number;
  y: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function segmentHitsCircle(start: Vector2, end: Vector2, center: Vector2, radius: number): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const distSq = (start.x - center.x) ** 2 + (start.y - center.y) ** 2;
    return distSq <= radius * radius;
  }

  const t = clamp01(((center.x - start.x) * dx + (center.y - start.y) * dy) / lengthSq);
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;
  const distSq = (closestX - center.x) ** 2 + (closestY - center.y) ** 2;
  return distSq <= radius * radius;
}
