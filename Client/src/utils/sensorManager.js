/**
 * SensorManager — Ingests and normalizes phone in-built motion & orientation sensors
 * - Vector Window Averaging with low latency (5 samples).
 * - Precise Deadband Filter (1.4°).
 * - Instant, natural compass response.
 */

class SensorManager {
  constructor() {
    this.isListening = false;
    this.orientationCallbacks = new Set();
    this.motionCallbacks = new Set();
    this.statusCallbacks = new Set();

    this.currentHeading = 0; // Degrees (0-360, 0 = North)
    this.filteredHeading = 0; // Smoothed heading
    this.isInitialized = false;

    // Fast 5-sample vector buffer
    this.headingVectorBuffer = [];
    this.vectorBufferSize = 5;

    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleOrientationAbsolute = this.handleOrientationAbsolute.bind(this);
    this.handleMotion = this.handleMotion.bind(this);
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

    this.isListening = true;
    this.isInitialized = false;
    this.headingVectorBuffer = [];
    this.notifyStatus({ status: 'active', message: 'Sensors active' });
    return true;
  }

  stop() {
    if (!this.isListening) return;

    if ('ondeviceorientationabsolute' in window) {
      window.removeEventListener('deviceorientationabsolute', this.handleOrientationAbsolute, true);
    }
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);

    this.isListening = false;
    this.notifyStatus({ status: 'stopped', message: 'Sensors stopped' });
  }

  handleOrientationAbsolute(event) {
    if (event.alpha !== null && event.alpha !== undefined) {
      const heading = (360 - event.alpha) % 360;
      this.updateHeading(heading, event);
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
      this.updateHeading(heading, event);
    }
  }

  updateHeading(rawHeading, event) {
    const rad = (rawHeading * Math.PI) / 180;
    this.headingVectorBuffer.push({ sin: Math.sin(rad), cos: Math.cos(rad) });
    if (this.headingVectorBuffer.length > this.vectorBufferSize) {
      this.headingVectorBuffer.shift();
    }

    const sumSin = this.headingVectorBuffer.reduce((acc, v) => acc + v.sin, 0);
    const sumCos = this.headingVectorBuffer.reduce((acc, v) => acc + v.cos, 0);
    const avgRad = Math.atan2(sumSin, sumCos);
    const averagedHeading = ((avgRad * 180) / Math.PI + 360) % 360;

    if (!this.isInitialized) {
      this.filteredHeading = averagedHeading;
      this.currentHeading = averagedHeading;
      this.isInitialized = true;
      this.orientationCallbacks.forEach((cb) => cb(this.filteredHeading, event));
      return;
    }

    let diff = ((averagedHeading - this.filteredHeading + 180) % 360) - 180;
    if (diff < -180) diff += 360;

    const absDiff = Math.abs(diff);

    // Deadband for micro-jitter
    if (absDiff < 1.4) {
      return;
    }

    // Responsive smoothing
    const alpha = absDiff > 25 ? 0.45 : 0.22;

    this.filteredHeading = (this.filteredHeading + diff * alpha + 360) % 360;
    this.currentHeading = averagedHeading;

    this.orientationCallbacks.forEach((cb) => cb(this.filteredHeading, event));
  }

  handleMotion(event) {
    this.motionCallbacks.forEach((cb) => cb(event));
  }

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
