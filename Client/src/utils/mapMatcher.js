import { svgToWorld } from '../constants/mapConstants';

/**
 * Projects a point P(px, pz) onto the line segment A(ax, az) -> B(bx, bz)
 */
function projectPointOnSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;

  const abLenSq = abx * abx + abz * abz;
  if (abLenSq === 0) return { x: ax, z: az, t: 0 };

  // Projection scalar t clamped between 0 and 1
  let t = (apx * abx + apz * abz) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: ax + t * abx,
    z: az + t * abz,
    t,
  };
}

/**
 * MapMatcher — Snaps raw PDR positions onto the active navigation route
 * or nearest corridor to prevent wall penetration and sensor drift.
 */
export class MapMatcher {
  /**
   * Snaps a position to the nearest point on the active route
   * @param {Object} rawPos - { x, z } in 3D world coordinates
   * @param {Array} routePath - Array of route nodes with { x, y, name }
   * @param {Number} maxSnapDistance - Maximum distance in 3D units to snap (default 120)
   */
  static snapToRoute(rawPos, routePath, maxSnapDistance = 120) {
    if (!routePath || routePath.length < 2) {
      return { x: rawPos.x, z: rawPos.z, isSnapped: false };
    }

    let minDistance = Infinity;
    let closestPoint = { x: rawPos.x, z: rawPos.z };
    let segmentIndex = 0;

    for (let i = 0; i < routePath.length - 1; i++) {
      const nodeA = routePath[i];
      const nodeB = routePath[i + 1];

      const [ax, az] = svgToWorld(nodeA.x, nodeA.y);
      const [bx, bz] = svgToWorld(nodeB.x, nodeB.y);

      const proj = projectPointOnSegment(rawPos.x, rawPos.z, ax, az, bx, bz);
      const dist = Math.hypot(rawPos.x - proj.x, rawPos.z - proj.z);

      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = { x: proj.x, z: proj.z };
        segmentIndex = i;
      }
    }

    // Snap only if within threshold; otherwise blend smoothly
    if (minDistance <= maxSnapDistance) {
      return {
        x: closestPoint.x,
        z: closestPoint.z,
        isSnapped: true,
        segmentIndex,
        distanceToPath: minDistance,
      };
    }

    return {
      x: rawPos.x,
      z: rawPos.z,
      isSnapped: false,
      distanceToPath: minDistance,
    };
  }
}

export default MapMatcher;
