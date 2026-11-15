import { Timer } from 'three/src/core/Timer.js';

// R3F 9 still expects the Clock interface. Keep that interface over Timer until
// R3F's Timer migration is stable, without constructing the deprecated Clock.
// One visibility listener is shared by every Canvas, including short-lived previews.
let visibilityEpoch = 0;
const onVisibilityChange = () => { visibilityEpoch++; };
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
if (import.meta.hot) import.meta.hot.dispose(() => {
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
});

export class TimerClock {
  autoStart: boolean;
  startTime = 0;
  oldTime = 0;
  elapsedTime = 0;
  running = false;
  private timer = new Timer();
  private visibility = visibilityEpoch;

  constructor(autoStart = true) { this.autoStart = autoStart; }

  start() {
    this.startTime = this.oldTime = performance.now();
    this.elapsedTime = 0;
    this.running = true;
    this.visibility = visibilityEpoch;
    this.timer.reset();
  }

  stop() {
    this.getElapsedTime();
    this.running = false;
    this.autoStart = false;
  }

  getElapsedTime() {
    this.getDelta();
    return this.elapsedTime;
  }

  getDelta() {
    if (this.autoStart && !this.running) { this.start(); return 0; }
    if (!this.running) return 0;
    // A demand-rendered Canvas can spend minutes without a frame in a hidden tab.
    if (this.visibility !== visibilityEpoch || (typeof document !== 'undefined' && document.hidden)) {
      this.visibility = visibilityEpoch;
      this.timer.reset();
      this.oldTime = performance.now();
      return 0;
    }
    this.timer.update();
    const delta = this.timer.getDelta();
    this.oldTime = performance.now();
    this.elapsedTime += delta;
    return delta;
  }
}
