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
 * and applies Path Alignment Heading Gating.
 */
export class MapMatcher {
  /**
   * Snaps a position to the nearest point on the active route
   * @param {Object} rawPos - { x, z } in 3D world coordinates
   * @param {Array} routePath - Array of route nodes with { x, y, name }
   * @param {Number} maxSnapDistance - Maximum distance in 3D units to snap
   */
  static snapToRoute(rawPos, routePath, maxSnapDistance = 140) {
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

  /**
   * Calculates the forward direction angle of the current corridor segment
   * @returns {Number} Angle in radians (0 rad = North / -Z, PI/2 = East / +X)
   */
  static getSegmentHeading(nodeA, nodeB) {
    const [ax, az] = svgToWorld(nodeA.x, nodeA.y);
    const [bx, bz] = svgToWorld(nodeB.x, nodeB.y);

    const dx = bx - ax;
    const dz = bz - az;

    // In Three.js: dx = L * sin(theta), dz = -L * cos(theta) -> theta = atan2(dx, -dz)
    return Math.atan2(dx, -dz);
  }

  /**
   * Checks if user heading is aligned with the corridor within tolerance
   * Allows slight left/right turns (e.g. ±55 degrees)
   */
  static isHeadingAligned(userHeadingRad, pathHeadingRad, maxAngleToleranceDeg = 55) {
    const diff = ((userHeadingRad - pathHeadingRad + Math.PI) % (2 * Math.PI)) - Math.PI;
    const absDiffDeg = (Math.abs(diff) * 180) / Math.PI;
    return absDiffDeg <= maxAngleToleranceDeg;
  }
}

export default MapMatcher;
