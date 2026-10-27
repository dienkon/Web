import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Suspend both rendering and frame-driven simulation while the canvas cannot
 * be seen. R3F resets its clock when the loop resumes, avoiding a catch-up tick. */
export function RenderActivity() {
  const { gl, setFrameloop } = useThree();
  useEffect(() => {
    let intersects = true;
    const update = () => setFrameloop(intersects && !document.hidden ? 'always' : 'never');
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(gl.domElement);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, [gl, setFrameloop]);
  return null;
}
