import sensorManager from './sensorManager';
import MapMatcher from './mapMatcher';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Robust Pedestrian Dead Reckoning (PDR) Engine
 * - Parametric Polyline Progression: Effortless 1-step corner and turn wrapping.
 * - Gravity-Projected Vertical Acceleration step detection.
 * - Path Alignment Heading Gating with Corner Lookahead.
 */
class PDREngine {
  constructor() {
    this.isTracking = false;
    this.stepCallbacks = new Set();
    this.positionCallbacks = new Set();
    this.debugCallbacks = new Set();

    // Current position in 3D world coordinates
    this.currentPosition = { x: 0, z: 0 };
    this.currentHeading = 0; // Heading in radians
    this.rawHeadingDeg = 0;
    this.compassOffsetDeg = 0;

    // Configurable Tuning Parameters
    this.stepPeakThreshold = 0.1; // m/s^2 upward bounce on foot strike
    this.stepValleyThreshold = -0.40; // m/s^2 downward bounce on unload
    this.baseStepLength = 22.5; // Map units per step (~0.85m scaled)
    this.minStepIntervalMs = 300; // Cadence lockout in ms
    this.gravityAlpha = 0.92;

    // Path Alignment Gating & Corner Lookahead
    this.isPathGatingActive = true;
    this.maxPathAngleDeg = 65; // Generous ±65° natural walking cone
    this.activeRoutePath = null;

    // Parametric 1D Polyline Progress along active route
    this.routePolyline = []; // Array of segments with start, end, length, cumDist
    this.totalRouteLength = 0;
    this.currentRouteDist = 0;

    // State tracking
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

  setInitialPosition(x, z) {
    this.currentPosition = { x, z };
    this.syncRouteDistFromPosition();
    this.notifyPosition();
  }

  setActiveRoutePath(routePath) {
    this.activeRoutePath = routePath;
    this.buildRoutePolyline();
    this.syncRouteDistFromPosition();
  }

  /**
   * Build pre-computed 1D polyline for seamless corner traversal
   */
  buildRoutePolyline() {
    if (!this.activeRoutePath || this.activeRoutePath.length < 2) {
      this.routePolyline = [];
      this.totalRouteLength = 0;
      return;
    }

    this.routePolyline = [];
    let cumDist = 0;

    for (let i = 0; i < this.activeRoutePath.length - 1; i++) {
      const nodeA = this.activeRoutePath[i];
      const nodeB = this.activeRoutePath[i + 1];

      const [ax, az] = svgToWorld(nodeA.x, nodeA.y);
      const [bx, bz] = svgToWorld(nodeB.x, nodeB.y);

      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const heading = Math.atan2(dx, -dz);

      this.routePolyline.push({
        index: i,
        ax,
        az,
        bx,
        bz,
        len,
        startDist: cumDist,
        endDist: cumDist + len,
        heading,
      });

      cumDist += len;
    }

    this.totalRouteLength = cumDist;
  }

  /**
   * Sync 1D route distance from current (x, z) position
   */
  syncRouteDistFromPosition() {
    if (!this.routePolyline || this.routePolyline.length === 0) return;

    let minDistance = Infinity;
    let bestDistAlong = 0;

    for (let i = 0; i < this.routePolyline.length; i++) {
      const seg = this.routePolyline[i];
      const abx = seg.bx - seg.ax;
      const abz = seg.bz - seg.az;
      const apx = this.currentPosition.x - seg.ax;
      const apz = this.currentPosition.z - seg.az;

      const abLenSq = seg.len * seg.len;
      let t = abLenSq > 0 ? (apx * abx + apz * abz) / abLenSq : 0;
      t = Math.max(0, Math.min(1, t));

      const projX = seg.ax + t * abx;
      const projZ = seg.az + t * abz;
      const dist = Math.hypot(this.currentPosition.x - projX, this.currentPosition.z - projZ);

      if (dist < minDistance) {
        minDistance = dist;
        bestDistAlong = seg.startDist + t * seg.len;
      }
    }

    this.currentRouteDist = bestDistAlong;
  }

  /**
   * Convert 1D distance along polyline to 3D world (x, z) coordinate
   */
  getPositionAtDistance(dist) {
    if (!this.routePolyline || this.routePolyline.length === 0) {
      return { ...this.currentPosition };
    }

    const clampedDist = Math.max(0, Math.min(this.totalRouteLength, dist));

    for (let i = 0; i < this.routePolyline.length; i++) {
      const seg = this.routePolyline[i];
      if (clampedDist >= seg.startDist && clampedDist <= seg.endDist) {
        const segProgress = seg.len > 0 ? (clampedDist - seg.startDist) / seg.len : 0;
        return {
          x: seg.ax + segProgress * (seg.bx - seg.ax),
          z: seg.az + segProgress * (seg.bz - seg.az),
        };
      }
    }

    const lastSeg = this.routePolyline[this.routePolyline.length - 1];
    return { x: lastSeg.bx, z: lastSeg.bz };
  }

  setStepPeakThreshold(val) {
    this.stepPeakThreshold = Number(val);
  }

  setBaseStepLength(val) {
    this.baseStepLength = Number(val);
  }

  setMinStepIntervalMs(val) {
    this.minStepIntervalMs = Number(val);
  }

  setCompassOffset(offsetDeg) {
    this.compassOffsetDeg = Number(offsetDeg);
    this.updateComputedHeading();
  }

  setPathGating(active, angleDeg = 65) {
    this.isPathGatingActive = Boolean(active);
    this.maxPathAngleDeg = Number(angleDeg);
  }

  start(initialX = 0, initialZ = 0) {
    this.currentPosition = { x: initialX, z: initialZ };
    this.isTracking = true;
    this.stepState = 0;
    this.lastStepTime = Date.now();
    this.hasGravityEstimate = false;
    this.vertBuffer = [];

    this.buildRoutePolyline();
    this.syncRouteDistFromPosition();

    this.unsubMotion = sensorManager.onMotion(this.handleMotion);
    this.unsubOrientation = sensorManager.onOrientation(this.handleOrientation);
    sensorManager.start();

    this.notifyPosition();
  }

  stop() {
    this.isTracking = false;
    if (this.unsubMotion) this.unsubMotion();
    if (this.unsubOrientation) this.unsubOrientation();
    sensorManager.stop();
  }

  handleOrientation(headingDegrees) {
    this.rawHeadingDeg = headingDegrees;
    this.updateComputedHeading();
  }

  updateComputedHeading() {
    const alignedHeadingDeg = (this.rawHeadingDeg + this.compassOffsetDeg + 360) % 360;
    this.currentHeading = (alignedHeadingDeg * Math.PI) / 180;
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

        this.processStep(this.baseStepLength);

        // Haptic feedback
        if (navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {}
        }
      }
    }
  }

  /**
   * Applies step movement with Effortless Polyline Corner Wrapping
   */
  processStep(stepLength = 12.0) {
    const prevPos = { ...this.currentPosition };

    // 1. If active navigation route polyline is available:
    if (this.routePolyline && this.routePolyline.length > 0) {
      // Find current segment along route
      let currentSegIndex = 0;
      for (let i = 0; i < this.routePolyline.length; i++) {
        if (
          this.currentRouteDist >= this.routePolyline[i].startDist &&
          this.currentRouteDist <= this.routePolyline[i].endDist
        ) {
          currentSegIndex = i;
          break;
        }
      }

      const currentSeg = this.routePolyline[currentSegIndex];
      const nextSeg =
        currentSegIndex + 1 < this.routePolyline.length
          ? this.routePolyline[currentSegIndex + 1]
          : null;

      // Check alignment with current segment
      const diffCurrent = Math.abs(
        ((this.currentHeading - currentSeg.heading + Math.PI) % (2 * Math.PI)) - Math.PI
      );
      const diffCurrentDeg = (diffCurrent * 180) / Math.PI;

      // Check alignment with upcoming segment around corner
      let isFacingNextCorner = false;
      if (nextSeg) {
        const diffNext = Math.abs(
          ((this.currentHeading - nextSeg.heading + Math.PI) % (2 * Math.PI)) - Math.PI
        );
        const diffNextDeg = (diffNext * 180) / Math.PI;
        const distToEndOfSeg = currentSeg.endDist - this.currentRouteDist;

        // If near corner (< 50 units) and facing the next corridor
        if (distToEndOfSeg < 50 && diffNextDeg <= this.maxPathAngleDeg) {
          isFacingNextCorner = true;
        }
      }

      // If Path Gating is enabled: check if user is facing current or next corridor
      if (this.isPathGatingActive) {
        if (diffCurrentDeg > this.maxPathAngleDeg && !isFacingNextCorner) {
          return; // Gated: facing into a wall
        }
      }

      // Advance 1D route progress distance smoothly around corners!
      this.currentRouteDist = Math.min(
        this.totalRouteLength,
        this.currentRouteDist + stepLength
      );

      // Convert 1D distance to 3D world coordinate
      this.currentPosition = this.getPositionAtDistance(this.currentRouteDist);
    } else {
      // 2. Free Roaming mode (no route active):
      const dx = stepLength * Math.sin(this.currentHeading);
      const dz = -stepLength * Math.cos(this.currentHeading);
      this.currentPosition.x += dx;
      this.currentPosition.z += dz;
    }

    const stepData = {
      stepLength,
      heading: this.currentHeading,
      headingDeg: (this.currentHeading * 180) / Math.PI,
      from: prevPos,
      to: { ...this.currentPosition },
      timestamp: Date.now(),
    };

    this.stepCallbacks.forEach((cb) => cb(stepData));
    this.notifyPosition();
  }

  simulateStep(directionAngleDeg = null, stepDistance = null) {
    const d = stepDistance !== null ? Number(stepDistance) : this.baseStepLength;
    this.processStep(d);
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
    this.positionCallbacks.forEach((cb) =>
      cb({ ...this.currentPosition, heading: this.currentHeading })
    );
  }
}

export const pdrEngine = new PDREngine();
export default pdrEngine;
