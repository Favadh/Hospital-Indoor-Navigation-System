/**
 * SensorManager — Clean, Direct Phone Orientation and Motion Ingestion
 * Uses direct standard sensor event listeners with zero synthetic jitter or drift.
 */
class SensorManager {
  constructor() {
    this.isListening = false;
    this.orientationCallbacks = new Set();
    this.motionCallbacks = new Set();
    this.statusCallbacks = new Set();

    this.currentHeading = 0;

    this.handleOrientation = this.handleOrientation.bind(this);
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

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('devicemotion', this.handleMotion, true);

    this.isListening = true;
    this.notifyStatus({ status: 'active', message: 'Sensors active' });
    return true;
  }

  stop() {
    if (!this.isListening) return;

    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);

    this.isListening = false;
    this.notifyStatus({ status: 'stopped', message: 'Sensors stopped' });
  }

  handleOrientation(event) {
    if (!this.isListening) return;

    let dir = 0;
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      dir = event.webkitCompassHeading;
    } else if (event.alpha !== null && event.alpha !== undefined) {
      dir = (360 - event.alpha) % 360;
    }

    this.currentHeading = dir;
    this.orientationCallbacks.forEach((cb) => cb(dir, event));
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
