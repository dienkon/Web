// Use the same Three implementation for the app, R3F and its optimized deps.
// Only the legacy Clock export is adapted; addons and all other classes stay native.
export * from 'three/src/Three.js';
export { TimerClock as Clock } from './TimerClock';
