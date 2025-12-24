export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

// 3D Point-Segment Distance Check
export function segmentHitsSphere(start: Vector3, end: Vector3, center: Vector3, radius: number): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;

  // Segment is a single point
  if (lengthSq === 0) {
    const distSq = (start.x - center.x) ** 2 + (start.y - center.y) ** 2 + (start.z - center.z) ** 2;
    return distSq <= radius * radius;
  }

  // Project center onto segment (t is 0..1 along the line)
  const t = clamp01(
    ((center.x - start.x) * dx + (center.y - start.y) * dy + (center.z - start.z) * dz) / lengthSq
  );

  // Closest point on segment
  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;
  const closestZ = start.z + t * dz;

  // Check distance squared
  const distSq = (closestX - center.x) ** 2 + (closestY - center.y) ** 2 + (closestZ - center.z) ** 2;
  return distSq <= radius * radius;
}
