import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Html as DreiHtml } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';

// DOM gets its own React root: R3F must never attempt to render DOM portal children as meshes.
export function SceneHtml(props: React.ComponentProps<typeof DreiHtml>) {
  const { gl, camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const domRoot = useRef<Root | null>(null);
  const point = useRef(new THREE.Vector3());
  const isModal = (props.zIndexRange?.[0] ?? 0) >= 1000;
  const blocked = useStore(isSceneInputBlocked);
  useLayoutEffect(() => {
    const el = document.createElement('div');
    el.dataset.ui = '';
    el.style.cssText = isModal ? 'position:fixed;inset:0;z-index:1200;pointer-events:none' : 'position:absolute;left:0;top:0;z-index:20;pointer-events:none';
    const host = isModal ? document.body : gl.domElement.parentElement;
    host?.appendChild(el); element.current = el;
    const root = createRoot(el); domRoot.current = root;
    return () => { element.current = null; domRoot.current = null; el.remove(); queueMicrotask(() => root.unmount()); };
  }, [gl, isModal]);
  useLayoutEffect(() => {
    domRoot.current?.render(isModal
      ? <div className="scene-modal fixed inset-0 pointer-events-none">{props.children}</div>
      : blocked ? null : <div className={`scene-label ${props.className ?? ''}`}>{props.children}</div>);
  });
  useEffect(() => {
    if (!isModal) return;
    useStore.setState(s => ({ sceneModalCount: s.sceneModalCount + 1 }));
    return () => { useStore.setState(s => ({ sceneModalCount: Math.max(0, s.sceneModalCount - 1) })); };
  }, [isModal]);
  useFrame(() => {
    if (isModal || !element.current || !group.current) return;
    group.current.updateWorldMatrix(true, false);
    group.current.getWorldPosition(point.current); point.current.project(camera);
    const p = point.current;
    element.current.style.visibility = blocked || p.z > 1 || p.z < -1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2 ? 'hidden' : 'visible';
    element.current.style.transform = `translate(${(p.x + 1) * size.width / 2}px,${(1 - p.y) * size.height / 2}px) translate(-50%,-50%)`;
  });
  return <group ref={group} position={props.position} rotation={props.rotation} />;
}
