import sensorManager from './sensorManager';
import { svgToWorld } from '../constants/mapConstants';

/**
 * 2D Geometry helpers for Wall Collision & Doorway Navigation
 */
function ccw(A, B, C) {
  return (C.z - A.z) * (B.x - A.x) > (B.z - A.z) * (C.x - A.x);
}

function lineSegmentsIntersect(p1, p2, p3, p4) {
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

function distToSegmentSq(p, v, w) {
  const l2 = (w.x - v.x) ** 2 + (w.z - v.z) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.z - v.z) ** 2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projZ = v.z + t * (w.z - v.z);
  return (p.x - projX) ** 2 + (p.z - projZ) ** 2;
}

/**
 * Robust Pedestrian Dead Reckoning (PDR) Engine with:
 * - 100% Polyline Path Locking during active navigation.
 * - Free Dead-Reckoning with 2D Wall Collision & Doorway Passing when exploring.
 * - Solid Wall Blocking & Sliding (stops at solid walls, passes freely through open doors).
 */
class PDREngine {
  constructor() {
    this.isTracking = false;
    this.stepCallbacks = new Set();
    this.positionCallbacks = new Set();
    this.debugCallbacks = new Set();

    // Position & Heading
    this.currentPosition = { x: 0, z: 0 };
    this.rawHeadingDeg = 0;
    this.compassOffsetDeg = null; // Auto-calibrated on first step
    this.currentPathAngle = 0;

    // Step state
    this.steps = 0;

    // Configurable Tuning Parameters
    this.stepPeakThreshold = 0.1;
    this.stepValleyThreshold = -0.40;
    this.baseStepLength = 22.5;
    this.minStepIntervalMs = 300;
    this.gravityAlpha = 0.92;

    // Active Route Path
    this.activeRoutePath = null;
    this.routePoints3D = [];
    this.totalRouteDistance = 0;

    // Wall Segments for Collision Detection
    this.wallSegments = [];
    this.loadWallSegments();

    // Accelerometer filtering state
    this.lastStepTime = 0;
    this.gx = 0;
    this.gy = 9.8;
    this.gz = 0;
    this.hasGravityEstimate = false;

    this.vertBuffer = [];
    this.bufferSize = 10;
    this.stepState = 0;
    this.peakValue = 0;

    this.handleMotion = this.handleMotion.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
  }

  loadWallSegments() {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/Hospital G.svg')
        .then((res) => res.text())
        .then((svgText) => {
          this.parseWallSegments(svgText);
        })
        .catch((err) => {
          console.warn('Failed to load wall segments for collision detection:', err);
        });
    }
  }

  parseWallSegments(svgText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const lines = doc.querySelectorAll('line');
      const segs = [];
      lines.forEach((el) => {
        const stroke = el.getAttribute('stroke');
        if (stroke !== 'black') return;
        const x1 = parseFloat(el.getAttribute('x1')) - 960;
        const y1 = parseFloat(el.getAttribute('y1')) - 540;
        const x2 = parseFloat(el.getAttribute('x2')) - 960;
        const y2 = parseFloat(el.getAttribute('y2')) - 540;
        if (Math.hypot(x2 - x1, y2 - y1) < 1) return;
        segs.push({ p1: { x: x1, z: y1 }, p2: { x: x2, z: y2 } });
      });
      this.wallSegments = segs;
    } catch (e) {
      console.warn('Error parsing wall segments:', e);
    }
  }

  isMovementValid(from, to) {
    // 1. Outer hospital floor boundary limits
    if (to.x < -930 || to.x > 930 || to.z < -510 || to.z > 510) {
      return false;
    }

    if (!this.wallSegments || this.wallSegments.length === 0) {
      return true;
    }

    const wallRadiusSq = 7 * 7; // Wall thickness buffer
    for (let i = 0; i < this.wallSegments.length; i++) {
      const seg = this.wallSegments[i];
      if (lineSegmentsIntersect(from, to, seg.p1, seg.p2)) {
        return false;
      }
      if (distToSegmentSq(to, seg.p1, seg.p2) < wallRadiusSq) {
        return false;
      }
    }
    return true;
  }

  setActiveRoutePath(routePath) {
    this.activeRoutePath = routePath;
    this.steps = 0;

    if (routePath && routePath.length >= 2) {
      this.routePoints3D = routePath.map((n) => {
        const [wx, wz] = svgToWorld(n.x, n.y);
        return { x: wx, z: wz };
      });

      let total = 0;
      for (let i = 0; i < this.routePoints3D.length - 1; i++) {
        const p1 = this.routePoints3D[i];
        const p2 = this.routePoints3D[i + 1];
        total += Math.hypot(p2.x - p1.x, p2.z - p1.z);
      }
      this.totalRouteDistance = total;

      // Initialize at start point of route
      this.currentPosition = { x: this.routePoints3D[0].x, z: this.routePoints3D[0].z };

      // Calculate initial corridor angle: Math.atan2(dz, dx)
      const dx = this.routePoints3D[1].x - this.routePoints3D[0].x;
      const dz = this.routePoints3D[1].z - this.routePoints3D[0].z;
      const angleRad = Math.atan2(dz, dx);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      this.currentPathAngle = angleDeg;

      // Auto-calibrate compass offset immediately so compass rotation works right at the start point
      if (this.rawHeadingDeg !== undefined && this.rawHeadingDeg !== null) {
        this.compassOffsetDeg = this.currentPathAngle - this.rawHeadingDeg;
      } else {
        this.compassOffsetDeg = null;
      }
    } else {
      this.routePoints3D = [];
      this.totalRouteDistance = 0;
      this.compassOffsetDeg = null;
    }

    this.notifyPosition();
  }

  setStepPeakThreshold(val) {
    this.stepPeakThreshold = Number(val);
  }

  setBaseStepLength(val) {
    this.baseStepLength = Number(val);
    this.updatePositionFromSteps();
  }

  setMinStepIntervalMs(val) {
    this.minStepIntervalMs = Number(val);
  }

  setCompassOffset(offsetDeg) {
    this.compassOffsetDeg = Number(offsetDeg);
    this.notifyPosition();
  }

  getDisplayHeadingDeg() {
    if (this.compassOffsetDeg !== null) {
      return (this.rawHeadingDeg + this.compassOffsetDeg + 360) % 360;
    }
    if (this.rawHeadingDeg !== undefined && this.rawHeadingDeg !== null) {
      return (this.rawHeadingDeg + 360) % 360;
    }
    return this.currentPathAngle || 0;
  }

  getDisplayHeadingRad() {
    return (this.getDisplayHeadingDeg() * Math.PI) / 180;
  }

  start(initialX = 0, initialZ = 0) {
    this.currentPosition = { x: initialX, z: initialZ };
    this.steps = 0;
    this.isTracking = true;
    this.stepState = 0;
    this.lastStepTime = Date.now();
    this.hasGravityEstimate = false;
    this.vertBuffer = [];

    this.unsubMotion = sensorManager.onMotion(this.handleMotion);
    this.unsubOrientation = sensorManager.onOrientation(this.handleOrientation);
    sensorManager.start();

    this.notifyPosition();
  }

  setTracking(active) {
    this.isTracking = Boolean(active);
    if (active) {
      this.steps = 0;
      this.stepState = 0;
      this.lastStepTime = Date.now();
      if (this.currentPathAngle !== undefined && this.rawHeadingDeg !== undefined) {
        this.compassOffsetDeg = this.currentPathAngle - this.rawHeadingDeg;
      }
    }
  }

  stop() {
    this.isTracking = false;
    if (this.unsubMotion) this.unsubMotion();
    if (this.unsubOrientation) this.unsubOrientation();
    sensorManager.stop();
  }

  handleOrientation(headingDegrees) {
    this.rawHeadingDeg = headingDegrees;
    if (this.compassOffsetDeg === null && this.currentPathAngle !== undefined) {
      this.compassOffsetDeg = this.currentPathAngle - this.rawHeadingDeg;
    }
    this.notifyPosition();
  }

  /**
   * Process accelerometer by isolating true vertical body bounce
   */
  handleMotion(event) {
    if (!this.isTracking) return;

    let ax = 0;
    let ay = 0;
    let az = 0;

    if (event.accelerationIncludingGravity) {
      ax = event.accelerationIncludingGravity.x || 0;
      ay = event.accelerationIncludingGravity.y || 0;
      az = event.accelerationIncludingGravity.z || 0;
    } else if (event.acceleration) {
      ax = event.acceleration.x || 0;
      ay = (event.acceleration.y || 0) + 9.81;
      az = event.acceleration.z || 0;
    } else {
      return;
    }

    if (!this.hasGravityEstimate) {
      this.gx = ax;
      this.gy = ay;
      this.gz = az;
      this.hasGravityEstimate = true;
    } else {
      const alpha = this.gravityAlpha;
      this.gx = alpha * this.gx + (1 - alpha) * ax;
      this.gy = alpha * this.gy + (1 - alpha) * ay;
      this.gz = alpha * this.gz + (1 - alpha) * az;
    }

    const gNorm = Math.hypot(this.gx, this.gy, this.gz);
    if (gNorm === 0) return;

    const ugx = this.gx / gNorm;
    const ugy = this.gy / gNorm;
    const ugz = this.gz / gNorm;

    const rawVerticalAcc = ax * ugx + ay * ugy + az * ugz;
    const verticalBounce = rawVerticalAcc - gNorm;

    this.vertBuffer.push(verticalBounce);
    if (this.vertBuffer.length > this.bufferSize) {
      this.vertBuffer.shift();
    }

    const smoothedBounce =
      this.vertBuffer.reduce((sum, v) => sum + v, 0) / this.vertBuffer.length;

    const now = Date.now();
    const timeSinceLastStep = now - this.lastStepTime;

    if (this.debugCallbacks.size > 0) {
      this.debugCallbacks.forEach((cb) =>
        cb({
          smoothedBounce,
          peakValue: this.peakValue,
          stepState: this.stepState,
          timeSinceLastStep,
        })
      );
    }

    if (this.stepState === 0) {
      if (
        smoothedBounce > this.stepPeakThreshold &&
        timeSinceLastStep >= this.minStepIntervalMs
      ) {
        this.stepState = 1;
        this.peakValue = smoothedBounce;
      }
    } else if (this.stepState === 1) {
      if (smoothedBounce > this.peakValue) {
        this.peakValue = smoothedBounce;
      } else if (smoothedBounce < this.stepValleyThreshold) {
        // Valid step cycle completed
        this.stepState = 0;
        this.lastStepTime = now;

        this.processStep();

        // Haptic feedback
        if (navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {}
        }
      }
    }
  }

  setInitialPosition(x, z) {
    // Clamp to map boundary bounds [-960, 960] and [-540, 540]
    const clampedX = Math.max(-950, Math.min(950, x));
    const clampedZ = Math.max(-530, Math.min(530, z));
    this.currentPosition = { x: clampedX, z: clampedZ };
    this.steps = 0;
    this.notifyPosition();
  }

  /**
   * Applies step movement:
   * - 100% Polyline Path Locking & Compass Gating when an active route is present.
   * - Free Dead-Reckoning with 2D Wall Collision & Doorway Passage when exploring freely without a route.
   */
  processStep() {
    if (this.routePoints3D && this.routePoints3D.length >= 2) {
      // 1. Automatic Initial Compass Alignment on first step
      if (this.compassOffsetDeg === null) {
        this.compassOffsetDeg = this.currentPathAngle - this.rawHeadingDeg;
      }

      // 2. Compute normalized heading and diff relative to current corridor angle
      let normalizedHeading = (this.rawHeadingDeg + this.compassOffsetDeg) % 360;
      if (normalizedHeading < 0) normalizedHeading += 360;

      let diff = Math.abs(normalizedHeading - this.currentPathAngle);
      if (diff > 180) diff = 360 - diff;

      // 3. Directional Step Gating (Forward / Backward) with destination clamping
      const maxSteps = Math.ceil(this.totalRouteDistance / this.baseStepLength);

      if (diff <= 85) {
        this.steps = Math.min(maxSteps, this.steps + 1);
      } else if (diff >= 95) {
        this.steps = Math.max(0, this.steps - 1);
      } else {
        // Sideways deadband (85° - 95°) ignored to prevent false movement
        return;
      }

      this.updatePositionFromSteps();
    } else {
      // Free Dead-Reckoning Mode with 2D Wall Collision Detection & Doorway Passing
      const rad = this.getDisplayHeadingRad();
      const dx = Math.cos(rad) * this.baseStepLength;
      const dz = Math.sin(rad) * this.baseStepLength;
      const cur = this.currentPosition;
      const target = { x: cur.x + dx, z: cur.z + dz };

      if (this.isMovementValid(cur, target)) {
        this.currentPosition = target;
        this.steps += 1;
      } else {
        // Wall sliding response along X or Z axis if valid
        const slideX = { x: cur.x + dx, z: cur.z };
        const slideZ = { x: cur.x, z: cur.z + dz };
        if (this.isMovementValid(cur, slideX)) {
          this.currentPosition = slideX;
          this.steps += 1;
        } else if (this.isMovementValid(cur, slideZ)) {
          this.currentPosition = slideZ;
          this.steps += 1;
        }
        // Blocked by solid wall: marker stays safe without crossing the wall
      }
    }

    const stepData = {
      stepLength: this.baseStepLength,
      steps: this.steps,
      heading: this.getDisplayHeadingRad(),
      headingDeg: this.getDisplayHeadingDeg(),
      position: { ...this.currentPosition },
      timestamp: Date.now(),
    };

    this.stepCallbacks.forEach((cb) => cb(stepData));
    this.notifyPosition();
  }

  /**
   * Calculates the exact parametric position along the polyline route
   */
  updatePositionFromSteps() {
    if (!this.routePoints3D || this.routePoints3D.length < 2) return;

    const points = this.routePoints3D;
    const maxDist = this.totalRouteDistance;
    let distanceToTravel = Math.max(0, Math.min(maxDist, this.steps * this.baseStepLength));

    let newPos = { x: points[0].x, z: points[0].z };
    let currentDir = { x: 1, z: 0 };

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segmentLogicalDist = Math.hypot(dx, dz);

      if (segmentLogicalDist > 0) {
        currentDir = { x: dx / segmentLogicalDist, z: dz / segmentLogicalDist };
      }

      if (distanceToTravel > segmentLogicalDist && segmentLogicalDist > 0) {
        distanceToTravel -= segmentLogicalDist;
        newPos = { x: p2.x, z: p2.z };
      } else if (segmentLogicalDist > 0) {
        const fraction = Math.max(0, Math.min(1, distanceToTravel / segmentLogicalDist));
        newPos = {
          x: p1.x + fraction * dx,
          z: p1.z + fraction * dz,
        };
        distanceToTravel = 0;
        break;
      }
    }

    // Strict containment guarantee
    this.currentPosition = {
      x: Math.max(-950, Math.min(950, newPos.x)),
      z: Math.max(-530, Math.min(530, newPos.z)),
    };

    // Update current corridor angle: Math.atan2(dz, dx)
    if (currentDir.x !== 0 || currentDir.z !== 0) {
      const angleRad = Math.atan2(currentDir.z, currentDir.x);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      this.currentPathAngle = angleDeg;
    }
  }

  simulateStep() {
    if (this.routePoints3D && this.routePoints3D.length >= 2) {
      const maxSteps = Math.ceil(this.totalRouteDistance / this.baseStepLength);
      this.steps = Math.min(maxSteps, this.steps + 1);
      this.updatePositionFromSteps();
    } else {
      // Free Dead-Reckoning simulation step with Wall Collision
      const rad = this.getDisplayHeadingRad();
      const dx = Math.cos(rad) * this.baseStepLength;
      const dz = Math.sin(rad) * this.baseStepLength;
      const cur = this.currentPosition;
      const target = { x: cur.x + dx, z: cur.z + dz };

      if (this.isMovementValid(cur, target)) {
        this.currentPosition = target;
        this.steps += 1;
      } else {
        const slideX = { x: cur.x + dx, z: cur.z };
        const slideZ = { x: cur.x, z: cur.z + dz };
        if (this.isMovementValid(cur, slideX)) {
          this.currentPosition = slideX;
          this.steps += 1;
        } else if (this.isMovementValid(cur, slideZ)) {
          this.currentPosition = slideZ;
          this.steps += 1;
        }
      }
    }

    const stepData = {
      stepLength: this.baseStepLength,
      steps: this.steps,
      heading: this.getDisplayHeadingRad(),
      headingDeg: this.getDisplayHeadingDeg(),
      position: { ...this.currentPosition },
      timestamp: Date.now(),
    };

    this.stepCallbacks.forEach((cb) => cb(stepData));
    this.notifyPosition();
  }

  onStep(callback) {
    this.stepCallbacks.add(callback);
    return () => this.stepCallbacks.delete(callback);
  }

  onPosition(callback) {
    this.positionCallbacks.add(callback);
    return () => this.positionCallbacks.delete(callback);
  }

  onDebug(callback) {
    this.debugCallbacks.add(callback);
    return () => this.debugCallbacks.delete(callback);
  }

  notifyPosition() {
    const dispHeading = this.getDisplayHeadingRad();
    const dispHeadingDeg = this.getDisplayHeadingDeg();
    this.positionCallbacks.forEach((cb) =>
      cb({
        x: this.currentPosition.x,
        z: this.currentPosition.z,
        heading: dispHeading,
        headingDeg: dispHeadingDeg,
        pathAngle: this.currentPathAngle,
      })
    );
  }
}

export const pdrEngine = new PDREngine();
export default pdrEngine;
