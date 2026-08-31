/**
 * SensorManager — Rock-Solid Indoor Compass via Gyroscope-Dominant Sensor Fusion
 *
 * Architecture:
 *   1. A single fixed-rate OUTPUT TICK (30Hz) emits the fused heading. Nothing else emits.
 *   2. Gyroscope integrates yaw silently at native ~60Hz between ticks.
 *   3. Magnetometer readings are collected into a deep circular buffer and only used as
 *      a slow drift anchor — never trusted for frame-to-frame direction.
 *   4. A stationary lock completely freezes heading when the phone is not rotating.
 *   5. Output deadband of 1.5° prevents the displayed compass from micro-twitching.
 */

class SensorManager {
  constructor() {
    this.isListening = false;
    this.orientationCallbacks = new Set();
    this.motionCallbacks = new Set();
    this.statusCallbacks = new Set();

    // === Fused output state ===
    this.fusedHeading = 0;        // The single source of truth (degrees 0-360)
    this.lastEmittedHeading = -1; // Last value actually sent to callbacks
    this.isInitialized = false;

    // === Gyroscope state ===
    this.lastMotionTime = 0;
    this.gyroYawRate = 0;         // Current filtered yaw rate (deg/s)
    this.gyroAvailable = false;   // True once we receive at least one rotationRate
    this.isPhoneStill = true;     // True when angular velocity is below noise floor

    // Gravity vector for accurate yaw projection
    this.gx = 0;
    this.gy = 9.8;
    this.gz = 0;
    this.hasGravity = false;

    // === Magnetometer state ===
    // Deep circular buffer (20 samples ≈ 1 second at 20Hz) for heavy smoothing
    this.magVectorBuffer = [];
    this.magBufferSize = 20;
    this.smoothedMagHeading = 0;
    this.magStabilityBuffer = [];  // Last 8 smoothed readings to detect stability
    this.magStabilitySize = 8;
    this.isMagStable = false;      // True when recent mag readings agree within ~6°

    // === Output tick ===
    this.outputInterval = null;
    this.OUTPUT_RATE_MS = 33;      // ~30Hz output tick

    // === Thresholds ===
    this.GYRO_NOISE_FLOOR = 1.2;      // deg/s — ignore rotations smaller than this
    this.STILL_THRESHOLD = 0.8;       // deg/s — phone is considered "still" below this
    this.OUTPUT_DEADBAND = 1.5;       // degrees — don't emit if change < this
    this.MAG_STABILITY_WINDOW = 6.0;  // degrees — mag is "stable" if spread < this
    this.MAG_BLEND_STILL = 0.025;     // 2.5% per tick when still & mag stable
    this.MAG_BLEND_MOVING = 0.010;    // 1.0% per tick while actively turning
    this.MAG_BLEND_LARGE_ERROR = 0.12; // 12% per tick when error > 50°

    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleOrientationAbsolute = this.handleOrientationAbsolute.bind(this);
    this.handleMotion = this.handleMotion.bind(this);
    this.outputTick = this.outputTick.bind(this);
  }

  async requestPermission() {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const orientationPerm = await DeviceOrientationEvent.requestPermission();
        if (orientationPerm !== 'granted') {
          this.notifyStatus({ status: 'denied', message: 'Orientation permission denied' });
          return false;
        }
      }

      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        const motionPerm = await DeviceMotionEvent.requestPermission();
        if (motionPerm !== 'granted') {
          this.notifyStatus({ status: 'denied', message: 'Motion permission denied' });
          return false;
        }
      }

      return true;
    } catch (err) {
      console.warn('Sensor permission error:', err);
      return false;
    }
  }

  async start() {
    if (this.isListening) return true;

    await this.requestPermission();

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', this.handleOrientationAbsolute, true);
    }
    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('devicemotion', this.handleMotion, true);

    // Start the single fixed-rate output tick
    this.outputInterval = setInterval(this.outputTick, this.OUTPUT_RATE_MS);

    this.isListening = true;
    this.isInitialized = false;
    this.gyroAvailable = false;
    this.lastMotionTime = Date.now();
    this.lastEmittedHeading = -1;
    this.magVectorBuffer = [];
    this.magStabilityBuffer = [];
    this.isMagStable = false;
    this.isPhoneStill = true;
    this.notifyStatus({ status: 'active', message: 'Sensors active' });
    return true;
  }

  stop() {
    if (!this.isListening) return;

    if (this.outputInterval) {
      clearInterval(this.outputInterval);
      this.outputInterval = null;
    }

    if ('ondeviceorientationabsolute' in window) {
      window.removeEventListener('deviceorientationabsolute', this.handleOrientationAbsolute, true);
    }
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);

    this.isListening = false;
    this.notifyStatus({ status: 'stopped', message: 'Sensors stopped' });
  }

  // ─── Magnetometer Input (silent — never emits directly) ───

  handleOrientationAbsolute(event) {
    if (event.alpha !== null && event.alpha !== undefined) {
      this.ingestMagReading((360 - event.alpha) % 360);
    }
  }

  handleOrientation(event) {
    let heading = null;
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null && event.alpha !== undefined) {
      heading = (360 - event.alpha) % 360;
    }
    if (heading !== null) {
      this.ingestMagReading(heading);
    }
  }

  /**
   * Silently accumulates magnetometer readings into a deep circular buffer.
   * Computes a smoothed heading and tracks whether the magnetometer is stable.
   * NEVER fires orientation callbacks — only the output tick does that.
   */
  ingestMagReading(rawHeading) {
    const rad = (rawHeading * Math.PI) / 180;
    this.magVectorBuffer.push({ sin: Math.sin(rad), cos: Math.cos(rad) });
    if (this.magVectorBuffer.length > this.magBufferSize) {
      this.magVectorBuffer.shift();
    }

    // Circular mean of the buffer
    const sumSin = this.magVectorBuffer.reduce((a, v) => a + v.sin, 0);
    const sumCos = this.magVectorBuffer.reduce((a, v) => a + v.cos, 0);
    this.smoothedMagHeading = ((Math.atan2(sumSin, sumCos) * 180) / Math.PI + 360) % 360;

    // First-ever reading → seed the fused heading
    if (!this.isInitialized) {
      this.fusedHeading = this.smoothedMagHeading;
      this.lastEmittedHeading = this.smoothedMagHeading;
      this.isInitialized = true;
    }

    // Track magnetometer stability (are recent smoothed readings consistent?)
    this.magStabilityBuffer.push(this.smoothedMagHeading);
    if (this.magStabilityBuffer.length > this.magStabilitySize) {
      this.magStabilityBuffer.shift();
    }

    if (this.magStabilityBuffer.length >= 4) {
      // Check angular spread of recent smoothed readings
      let maxDiff = 0;
      for (let i = 1; i < this.magStabilityBuffer.length; i++) {
        let d = ((this.magStabilityBuffer[i] - this.magStabilityBuffer[0] + 180) % 360) - 180;
        if (d < -180) d += 360;
        maxDiff = Math.max(maxDiff, Math.abs(d));
      }
      this.isMagStable = maxDiff < this.MAG_STABILITY_WINDOW;
    }
  }

  // ─── Gyroscope + Accelerometer Input (silent — never emits directly) ───

  handleMotion(event) {
    const now = Date.now();
    const dt = this.lastMotionTime > 0 ? (now - this.lastMotionTime) / 1000 : 0;
    this.lastMotionTime = now;

    // Track gravity vector for accurate yaw projection
    if (event.accelerationIncludingGravity) {
      const ax = event.accelerationIncludingGravity.x || 0;
      const ay = event.accelerationIncludingGravity.y || 0;
      const az = event.accelerationIncludingGravity.z || 0;

      if (!this.hasGravity) {
        this.gx = ax; this.gy = ay; this.gz = az;
        this.hasGravity = true;
      } else {
        this.gx = 0.92 * this.gx + 0.08 * ax;
        this.gy = 0.92 * this.gy + 0.08 * ay;
        this.gz = 0.92 * this.gz + 0.08 * az;
      }
    }

    // Integrate gyroscope yaw silently
    if (event.rotationRate && dt > 0 && dt < 0.15) {
      this.gyroAvailable = true;

      const rAlpha = event.rotationRate.alpha || 0;
      const rBeta = event.rotationRate.beta || 0;
      const rGamma = event.rotationRate.gamma || 0;

      // Project rotation rate onto gravity unit vector for true yaw
      let yawRate = 0;
      const gNorm = Math.hypot(this.gx, this.gy, this.gz);

      if (gNorm > 1.0) {
        const ugx = this.gx / gNorm;
        const ugy = this.gy / gNorm;
        const ugz = this.gz / gNorm;
        yawRate = -(rBeta * ugx + rGamma * ugy + rAlpha * ugz);
      } else {
        yawRate = -rAlpha;
      }

      // Smooth the yaw rate itself to kill single-sample spikes
      this.gyroYawRate = 0.6 * this.gyroYawRate + 0.4 * yawRate;

      // Classify phone as still or moving
      this.isPhoneStill = Math.abs(this.gyroYawRate) < this.STILL_THRESHOLD;

      // Integrate only above noise floor
      if (Math.abs(this.gyroYawRate) > this.GYRO_NOISE_FLOOR && this.isInitialized) {
        const delta = this.gyroYawRate * dt;
        this.fusedHeading = (this.fusedHeading + delta + 360) % 360;
      }
    }

    // Forward raw motion event for step detection (pdrEngine)
    this.motionCallbacks.forEach((cb) => cb(event));
  }

  // ─── Single Fixed-Rate Output Tick (30Hz) ───

  outputTick() {
    if (!this.isInitialized) return;

    // Apply magnetometer drift correction to fusedHeading
    if (this.gyroAvailable) {
      let magError = ((this.smoothedMagHeading - this.fusedHeading + 180) % 360) - 180;
      if (magError < -180) magError += 360;

      const absMagError = Math.abs(magError);

      if (absMagError > 50) {
        // Very large disagreement — phone may have been set down and repositioned
        this.fusedHeading = (this.fusedHeading + magError * this.MAG_BLEND_LARGE_ERROR + 360) % 360;
      } else if (this.isPhoneStill && this.isMagStable && absMagError > 3.0) {
        // Phone is still AND magnetometer has been stable: gently anchor toward mag North
        this.fusedHeading = (this.fusedHeading + magError * this.MAG_BLEND_STILL + 360) % 360;
      } else if (!this.isPhoneStill && absMagError > 5.0) {
        // Actively turning: use tiny mag blend to prevent long-term gyro drift
        this.fusedHeading = (this.fusedHeading + magError * this.MAG_BLEND_MOVING + 360) % 360;
      }
      // Otherwise: no magnetometer correction at all
    } else {
      // No gyroscope on this device — fall back to heavily smoothed magnetometer only
      let diff = ((this.smoothedMagHeading - this.fusedHeading + 180) % 360) - 180;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) < 2.5) return; // deadband
      const alpha = Math.abs(diff) > 25 ? 0.25 : 0.10;
      this.fusedHeading = (this.fusedHeading + diff * alpha + 360) % 360;
    }

    // Output deadband: only emit if heading actually changed enough to notice
    let emitDiff = ((this.fusedHeading - this.lastEmittedHeading + 180) % 360) - 180;
    if (emitDiff < -180) emitDiff += 360;

    if (Math.abs(emitDiff) >= this.OUTPUT_DEADBAND || this.lastEmittedHeading < 0) {
      this.lastEmittedHeading = this.fusedHeading;
      this.orientationCallbacks.forEach((cb) => cb(this.fusedHeading, null));
    }
  }

  // ─── Public API ───

  onOrientation(callback) {
    this.orientationCallbacks.add(callback);
    return () => this.orientationCallbacks.delete(callback);
  }

  onMotion(callback) {
    this.motionCallbacks.add(callback);
    return () => this.motionCallbacks.delete(callback);
  }

  onStatus(callback) {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  notifyStatus(status) {
    this.statusCallbacks.forEach((cb) => cb(status));
  }
}

export const sensorManager = new SensorManager();
export default sensorManager;
