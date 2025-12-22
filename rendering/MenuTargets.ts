export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

export interface MenuTarget {
  id: string;
  label: string;
  position: Vector3;
  radius: number;
}

export interface MenuHitResult {
  target: MenuTarget;
  point: Vector3;
  distance: number;
}

export const MENU_Z = -2;

const nearlyEqual = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function projectRayToPlane(ray: Ray, zPlane = MENU_Z): { point: Vector3; distance: number } | null {
  const { origin, direction } = ray;
  if (nearlyEqual(direction.z, 0)) return null;

  const t = (zPlane - origin.z) / direction.z;
  if (t <= 0) return null;

  return {
    point: {
      x: origin.x + direction.x * t,
      y: origin.y + direction.y * t,
      z: zPlane,
    },
    distance: t,
  };
}

export function hitTestTarget(ray: Ray, target: MenuTarget, zPlane = MENU_Z): MenuHitResult | null {
  const projection = projectRayToPlane(ray, zPlane);
  if (!projection) return null;

  const dx = projection.point.x - target.position.x;
  const dy = projection.point.y - target.position.y;
  const distance2D = Math.hypot(dx, dy);

  if (distance2D > target.radius) return null;

  return { target, point: projection.point, distance: projection.distance };
}

export class MenuTargetField {
  constructor(private readonly targets: MenuTarget[]) {}

  select(ray: Ray, zPlane = MENU_Z): MenuHitResult | null {
    const hits = this.targets
      .map(target => hitTestTarget(ray, target, zPlane))
      .filter((hit): hit is MenuHitResult => Boolean(hit));

    if (!hits.length) return null;

    return hits.reduce((best, current) => (current.distance < best.distance ? current : best));
  }

  static defaultLayout(): MenuTarget[] {
    return [
      { id: 'start', label: 'Start mission', position: { x: -0.5, y: 0.4, z: MENU_Z }, radius: 0.35 },
      { id: 'help', label: 'Help / Controls', position: { x: 0.3, y: 0.7, z: MENU_Z }, radius: 0.3 },
      { id: 'quit', label: 'Quit', position: { x: 0, y: -0.1, z: MENU_Z }, radius: 0.28 },
    ];
  }
}
