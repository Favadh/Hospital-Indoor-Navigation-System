import sensorManager from './sensorManager';

/**
 * Pedestrian Dead Reckoning (PDR) Engine
 * - Calculates step events using peak-valley acceleration detection.
 * - Estimates step length using the Weinberg biomechanical model.
 * - Computes (dX, dZ) displacement vectors from current orientation compass heading.
 */
class PDREngine {
  constructor() {
    this.isTracking = false;
    this.stepCallbacks = new Set();
    this.positionCallbacks = new Set();

    // Current position in 3D world coordinates
    this.currentPosition = { x: 0, z: 0 };
    this.currentHeading = 0; // Heading in radians

    // Step detection thresholds & state
    this.lastStepTime = 0;
    this.minStepIntervalMs = 280; // Fast walking minimum interval
    this.maxStepIntervalMs = 1200; // Slow walking maximum interval
    this.stepThreshold = 1.35; // Acceleration peak threshold in m/s^2 above baseline

    // Peak-valley window
    this.accelBuffer = [];
    this.bufferSize = 12;
    this.peakAcc = 0;
    this.valleyAcc = 0;
    this.isLookingForPeak = true;

    // Step Length Calibration (K factor for hospital scale)
    this.kFactor = 28.0; // Scaled to Three.js floor map units per step (approx 0.7m scaled)

    this.handleMotion = this.handleMotion.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
  }

  /**
   * Set starting position (e.g. from scanned QR code or initial node)
   */
  setInitialPosition(x, z) {
    this.currentPosition = { x, z };
    this.notifyPosition();
  }

  /**
   * Start PDR engine
   */
  start(initialX = 0, initialZ = 0) {
    this.currentPosition = { x: initialX, z: initialZ };
    this.isTracking = true;

    this.unsubMotion = sensorManager.onMotion(this.handleMotion);
    this.unsubOrientation = sensorManager.onOrientation(this.handleOrientation);
    sensorManager.start();

    this.notifyPosition();
  }

  /**
   * Stop PDR engine
   */
  stop() {
    this.isTracking = false;
    if (this.unsubMotion) this.unsubMotion();
    if (this.unsubOrientation) this.unsubOrientation();
    sensorManager.stop();
  }

  /**
   * Track live heading
   */
  handleOrientation(headingDegrees) {
    // Convert degrees to radians (0 deg = North = -Z direction in 3D world)
    this.currentHeading = (headingDegrees * Math.PI) / 180;
  }

  /**
   * Process accelerometer stream for step detection
   */
  handleMotion(accel) {
    if (!this.isTracking) return;

    const ax = accel.x || 0;
    const ay = accel.y || 0;
    const az = accel.z || 0;

    // Compute magnitude of acceleration
    const magnitude = Math.hypot(ax, ay, az);

    // Keep sliding window
    this.accelBuffer.push(magnitude);
    if (this.accelBuffer.length > this.bufferSize) {
      this.accelBuffer.shift();
    }

    // Moving average filter
    const avgMagnitude =
      this.accelBuffer.reduce((sum, val) => sum + val, 0) / this.accelBuffer.length;

    const now = Date.now();
    const timeSinceLastStep = now - this.lastStepTime;

    // Peak detection
    if (this.isLookingForPeak) {
      if (avgMagnitude > this.peakAcc) {
        this.peakAcc = avgMagnitude;
      } else if (
        this.peakAcc - avgMagnitude > 0.4 &&
        this.peakAcc > 9.8 + this.stepThreshold
      ) {
        // Peak confirmed, look for valley
        this.isLookingForPeak = false;
        this.valleyAcc = avgMagnitude;
      }
    } else {
      // Looking for valley
      if (avgMagnitude < this.valleyAcc) {
        this.valleyAcc = avgMagnitude;
      } else if (
        avgMagnitude - this.valleyAcc > 0.4 &&
        timeSinceLastStep > this.minStepIntervalMs
      ) {
        // Step detected!
        this.isLookingForPeak = true;
        this.lastStepTime = now;

        // Calculate step length using Weinberg formula: L = K * (Amax - Amin)^(1/4)
        const bounce = Math.max(0.1, this.peakAcc - this.valleyAcc);
        const stepLength = this.kFactor * Math.pow(bounce, 0.25);

        this.processStep(stepLength);

        // Reset peak/valley
        this.peakAcc = 0;
        this.valleyAcc = 999;
      }
    }
  }

  /**
   * Apply displacement on detected step
   */
  processStep(stepLength = 32.0) {
    // In Three.js world coordinates:
    // Heading 0 deg (North) -> -Z
    // Heading 90 deg (East) -> +X
    // Heading 180 deg (South) -> +Z
    // Heading 270 deg (West) -> -X
    const dx = stepLength * Math.sin(this.currentHeading);
    const dz = -stepLength * Math.cos(this.currentHeading);

    const prevPos = { ...this.currentPosition };
    this.currentPosition.x += dx;
    this.currentPosition.z += dz;

    const stepData = {
      stepLength,
      dx,
      dz,
      heading: this.currentHeading,
      headingDeg: (this.currentHeading * 180) / Math.PI,
      from: prevPos,
      to: { ...this.currentPosition },
      timestamp: Date.now(),
    };

    this.stepCallbacks.forEach((cb) => cb(stepData));
    this.notifyPosition();
  }

  /**
   * Manual step simulation for desktop testing / fallback
   */
  simulateStep(directionAngleDeg = null, stepDistance = 35) {
    const heading =
      directionAngleDeg !== null
        ? (directionAngleDeg * Math.PI) / 180
        : this.currentHeading;

    const dx = stepDistance * Math.sin(heading);
    const dz = -stepDistance * Math.cos(heading);

    const prevPos = { ...this.currentPosition };
    this.currentPosition.x += dx;
    this.currentPosition.z += dz;

    const stepData = {
      stepLength: stepDistance,
      dx,
      dz,
      heading,
      headingDeg: (heading * 180) / Math.PI,
      from: prevPos,
      to: { ...this.currentPosition },
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

  notifyPosition() {
    this.positionCallbacks.forEach((cb) =>
      cb({ ...this.currentPosition, heading: this.currentHeading })
    );
  }
}

export const pdrEngine = new PDREngine();
export default pdrEngine;
