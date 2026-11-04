import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

/** Explicitly owned GPU resources. The installed Drei ContactShadows leaves its
 * offscreen targets/materials alive when resolution changes or it unmounts. */
export function createContactShadowResources(resolution: number, size: number, color: string) {
  const target = new THREE.WebGLRenderTarget(resolution, resolution);
  const blurTarget = new THREE.WebGLRenderTarget(resolution, resolution);
  target.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false;
  const geometry = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
  const depth = new THREE.MeshDepthMaterial({ depthTest: false, depthWrite: false });
  depth.onBeforeCompile = shader => {
    shader.uniforms.ucolor = { value: new THREE.Color(color) };
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
      .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
  };
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  horizontal.depthTest = vertical.depthTest = false;
  const blurPlane = new THREE.Mesh(geometry, horizontal);
  const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true, opacity: 0.65, depthWrite: false });
  let disposed = false;
  return { target, blurTarget, geometry, depth, horizontal, vertical, blurPlane, material,
    dispose() {
      if (disposed) return;
      disposed = true;
      target.dispose(); blurTarget.dispose(); geometry.dispose(); depth.dispose();
      horizontal.dispose(); vertical.dispose(); material.dispose();
    },
  };
}

export function ContactShadows({ resolution }: { resolution: number }) {
  const { gl, scene } = useThree();
  const group = useRef<THREE.Group>(null);
  const camera = useRef<THREE.OrthographicCamera>(null);
  const [resources, setResources] = useState<ReturnType<typeof createContactShadowResources>>();
  const liveResources = useRef<ReturnType<typeof createContactShadowResources> | undefined>(undefined);
  useEffect(() => {
    // Allocate in a committed effect so StrictMode's discarded renders cannot
    // strand render targets. Each quality transition releases the old set.
    const next = createContactShadowResources(resolution, 24, '#0f172a');
    liveResources.current = next;
    setResources(next);
    return () => { liveResources.current = undefined; next.dispose(); };
  }, [resolution]);

  useFrame(() => {
    const r = liveResources.current, shadowCamera = camera.current, shadowGroup = group.current;
    if (!r || !shadowCamera || !shadowGroup) return;
    const background = scene.background, override = scene.overrideMaterial;
    const renderTarget = gl.getRenderTarget(), visible = shadowGroup.visible;
    const autoClear = gl.autoClear;
    shadowCamera.updateWorldMatrix(true, false);
    const blur = (amount: number) => {
      r.blurPlane.material = r.horizontal;
      r.horizontal.uniforms.tDiffuse.value = r.target.texture;
      r.horizontal.uniforms.h.value = amount / 256;
      gl.setRenderTarget(r.blurTarget); gl.render(r.blurPlane, shadowCamera);
      r.blurPlane.material = r.vertical;
      r.vertical.uniforms.tDiffuse.value = r.blurTarget.texture;
      r.vertical.uniforms.v.value = amount / 256;
      gl.setRenderTarget(r.target); gl.render(r.blurPlane, shadowCamera);
    };
    try {
      gl.autoClear = true;
      shadowGroup.visible = false;
      scene.background = null; scene.overrideMaterial = r.depth;
      gl.setRenderTarget(r.target); gl.render(scene, shadowCamera);
      blur(1.8); blur(1.8 * 0.4);
    } finally {
      scene.background = background; scene.overrideMaterial = override;
      shadowGroup.visible = visible; gl.autoClear = autoClear; gl.setRenderTarget(renderTarget);
    }
  });

  return <group ref={group} position={[0, -1.16, 0]} rotation-x={Math.PI / 2} dispose={null}>
    {resources && <mesh geometry={resources.geometry} material={resources.material}
      scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]} />}
    <orthographicCamera ref={camera} args={[-12, 12, 12, -12, 0, 4.5]} />
  </group>;
}
