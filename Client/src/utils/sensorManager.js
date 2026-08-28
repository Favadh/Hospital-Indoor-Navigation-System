/**
 * SensorManager — Ingests and normalizes phone in-built motion & orientation sensors
 * - DeviceOrientationEvent (Alpha / Compass Heading / Magnetometer)
 * - DeviceMotionEvent (Linear Acceleration & Accelerometer)
 * - Generic Sensor API (Magnetometer where supported)
 */

class SensorManager {
  constructor() {
    this.isListening = false;
    this.orientationCallbacks = new Set();
    this.motionCallbacks = new Set();
    this.statusCallbacks = new Set();

    this.currentHeading = 0; // Degrees (0-360, 0 = North)
    this.filteredHeading = 0; // Smoothed heading

    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleMotion = this.handleMotion.bind(this);
  }

  /**
   * Request permission for iOS 13+ devices and initialize listeners
   */
  async requestPermission() {
    try {
      // iOS 13+ DeviceOrientation permission check
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

      // iOS 13+ DeviceMotion permission check
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

  /**
   * Start listening to device motion and orientation sensors
   */
  async start() {
    if (this.isListening) return true;

    const granted = await this.requestPermission();
    if (!granted && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      return false;
    }

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('devicemotion', this.handleMotion, true);

    this.isListening = true;
    this.notifyStatus({ status: 'active', message: 'Sensors active' });
    return true;
  }

  /**
   * Stop listening to sensors
   */
  stop() {
    if (!this.isListening) return;

    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);

    this.isListening = false;
    this.notifyStatus({ status: 'stopped', message: 'Sensors stopped' });
  }

  /**
   * Handle phone orientation & magnetometer heading
   */
  handleOrientation(event) {
    let heading = 0;

    // 1. iOS Safari webkitCompassHeading (True/Magnetic North in degrees 0-360)
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      heading = event.webkitCompassHeading;
    }
    // 2. Android Chrome / Standard alpha (0-360, counter-clockwise)
    else if (event.alpha !== null && event.alpha !== undefined) {
      // Convert counter-clockwise alpha to clockwise compass heading
      heading = 360 - event.alpha;
      if (event.absolute === false) {
        // Relative heading fallback
        heading = (360 - event.alpha) % 360;
      }
    }

    // Low-pass exponential smoothing filter to remove hand jitter
    const diff = heading - this.filteredHeading;
    // Handle wrap-around at 0/360 degrees
    let normalizedDiff = ((diff + 180) % 360) - 180;
    if (normalizedDiff < -180) normalizedDiff += 360;

    this.filteredHeading = (this.filteredHeading + normalizedDiff * 0.15 + 360) % 360;
    this.currentHeading = heading;

    this.orientationCallbacks.forEach((cb) => cb(this.filteredHeading, event));
  }

  /**
   * Handle accelerometer & gyroscope motion
   */
  handleMotion(event) {
    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc) return;

    this.motionCallbacks.forEach((cb) => cb(acc, event));
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
