/** R3F sorts ascending. Negative priorities preserve automatic rendering while
 * committing chemistry before physical snapshots, then uploading particle data.
 * Material/shader subscribers retain their default priority of zero. */
export const FRAME_ORDER = { chemistry: -3, vesselPose: -2.75, effectsFrame: -2.5, physics: -2, particles: -1 } as const;
