import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useQualityStore } from '../vfx/quality';
import { Vector2 } from 'three';

/** Suspend both rendering and frame-driven simulation while the canvas cannot
 * be seen. R3F resets its clock when the loop resumes, avoiding a catch-up tick. */
export function RenderActivity() {
  const { gl, setFrameloop } = useThree();
  useEffect(() => {
    let intersects = true;
    let contextLost = gl.getContext().isContextLost();
    const update = () => setFrameloop(intersects && !document.hidden && !contextLost ? 'always' : 'never');
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      // Release costly visual passes before restoration, retaining the sample.
      const quality = useQualityStore.getState();
      if (quality.preference === 'auto') quality.setEffectiveTier('potato');
      update();
    };
    const onContextRestored = () => {
      // Restore the logical viewport as well as the drawing buffer. A context
      // reset can otherwise retain the wrong viewport on a scaled canvas.
      const size = gl.getSize(new Vector2());
      gl.setSize(size.x, size.y, false);
      contextLost = false;
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(gl.domElement);
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    gl.domElement.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
      gl.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      document.removeEventListener('visibilitychange', update);
    };
  }, [gl, setFrameloop]);
  return null;
}
