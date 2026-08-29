import sensorManager from './sensorManager';
import MapMatcher from './mapMatcher';
import { svgToWorld } from '../constants/mapConstants';

/**
 * Robust Pedestrian Dead Reckoning (PDR) Engine
 * - Soft Magnetic Corridor Guiding: Gently centers the arrow along the hallway centerline.
 * - Free exploration when walking off-path.
 * - Bidirectional (forward & backward) movement.
 * - Preserves exact sensitivity, thresholds, and stride calibrations.
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

    // Path Guiding & Corridor Centerline Snapping
    this.activeRoutePath = null;
    this.corridorSnapRadius = 65; // Distance within which magnetic centerline attraction applies
    this.centerlineAttraction = 0.20; // 65% magnetic blend to corridor centerline

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
    this.notifyPosition();
  }

  setActiveRoutePath(routePath) {
    this.activeRoutePath = routePath;
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

  start(initialX = 0, initialZ = 0) {
    this.currentPosition = { x: initialX, z: initialZ };
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
   * Applies step movement with Soft Magnetic Centerline Attraction
   */
  processStep(stepLength = 22.5) {
    const prevPos = { ...this.currentPosition };

    // 1. Raw step displacement along user heading
    let nextX = this.currentPosition.x + stepLength * Math.sin(this.currentHeading);
    let nextZ = this.currentPosition.z - stepLength * Math.cos(this.currentHeading);

    // 2. Soft corridor centerline magnetic guide (locks lightly to corridor)
    if (this.activeRoutePath && this.activeRoutePath.length >= 2) {
      const snapped = MapMatcher.snapToRoute({ x: nextX, z: nextZ }, this.activeRoutePath, this.corridorSnapRadius);

      if (snapped.isSnapped) {
        // Gently pull towards corridor centerline while retaining natural movement
        const blend = this.centerlineAttraction;
        nextX = nextX + blend * (snapped.x - nextX);
        nextZ = nextZ + blend * (snapped.z - nextZ);
      }
    }

    this.currentPosition.x = nextX;
    this.currentPosition.z = nextZ;

    const stepData = {
      stepLength,
      dx: nextX - prevPos.x,
      dz: nextZ - prevPos.z,
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
