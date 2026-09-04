import sensorManager from './sensorManager';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Robust Pedestrian Dead Reckoning (PDR) Engine with 100% Path Locking
 * - Pure 1D Parametric Traversal along the active route polyline.
 * - Zero Wall / Off-Path Drift: The marker is strictly locked to the calculated path.
 * - Automatic Initial Path-Heading Alignment (defaults to path direction until first step).
 * - Directional Step Gating (Forward if diff <= 60°, reverse if diff >= 120°, ignore sideways).
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

  setInitialPosition(x, z) {
    this.currentPosition = { x, z };
    this.steps = 0;
    this.notifyPosition();
  }

  setActiveRoutePath(routePath) {
    this.activeRoutePath = routePath;
    this.steps = 0;
    this.compassOffsetDeg = null; // Reset for auto-calibration on first step of new route

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
    } else {
      this.routePoints3D = [];
      this.totalRouteDistance = 0;
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
    if (this.routePoints3D && this.routePoints3D.length >= 2) {
      if (this.compassOffsetDeg === null) {
        return this.currentPathAngle;
      }
      return (this.rawHeadingDeg + this.compassOffsetDeg + 360) % 360;
    }
    return (this.rawHeadingDeg + (this.compassOffsetDeg || 0) + 360) % 360;
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
      this.compassOffsetDeg = null;
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

  /**
   * Applies step movement with 100% Polyline Path Locking & Compass Gating
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

      // 3. Directional Step Gating (Forward / Backward)
      if (diff <= 85) {
        this.steps += 1;
      } else if (diff >= 95) {
        this.steps = Math.max(0, this.steps - 1);
      } else {
        // Sideways deadband (85° - 95°) ignored to prevent false movement
        return;
      }

      this.updatePositionFromSteps();
    } else {
      // Free exploration fallback if no route is active
      const headingRad = this.getDisplayHeadingRad();
      const nextX = this.currentPosition.x + this.baseStepLength * Math.cos(headingRad);
      const nextZ = this.currentPosition.z + this.baseStepLength * Math.sin(headingRad);
      this.currentPosition = { x: nextX, z: nextZ };
      this.steps += 1;
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

    let distanceToTravel = this.steps * this.baseStepLength;
    const points = this.routePoints3D;

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

    this.currentPosition = newPos;

    // Update current corridor angle: Math.atan2(dz, dx)
    if (currentDir.x !== 0 || currentDir.z !== 0) {
      const angleRad = Math.atan2(currentDir.z, currentDir.x);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      this.currentPathAngle = angleDeg;
    }
  }

  simulateStep() {
    this.steps += 1;
    this.updatePositionFromSteps();

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
