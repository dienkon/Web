import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import gsap from "gsap";
import * as THREE from "three";

type Vec = [number, number, number];
type SceneProps = {
  chapter: number;
  reduced: boolean;
  low: boolean;
  dnaMode: string;
  exhibit: string;
  bloom: boolean;
  photos: string[];
  zoom: number;
  resetView: number;
  intro: boolean;
  onIntroEnd: () => void;
  onPhoto: (index: number) => void;
  onBase: (base: string) => void;
  onReady: () => void;
};
const gold = "#ebcfa3";
const cyan = "#48e0ce";
const purple = "#8972c9";
const pink = "#f5b8c8";
// Negative angle around +Y gives the right-handed B-DNA helix.
const twist = (-2 * Math.PI) / (0.315 * 10.5);
const v = (p: Vec) => new THREE.Vector3(...p);

function Rod({
  a,
  b,
  color = gold,
  radius = 0.025,
  glow = 0.3,
}: {
  a: Vec;
  b: Vec;
  color?: string;
  radius?: number;
  glow?: number;
}) {
  const { center, quaternion, length } = useMemo(() => {
    const start = v(a),
      end = v(b),
      direction = end.clone().sub(start);
    return {
      center: start.add(end).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    };
  }, [a, b]);
  return (
    <mesh position={center} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial
        color={color}
        metalness={0.5}
        roughness={0.25}
        emissive={color}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

function Arrow({ a, b, color = cyan }: { a: Vec; b: Vec; color?: string }) {
  const end = v(b),
    direction = end.clone().sub(v(a)).normalize(),
    quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction,
    );
  return (
    <>
      <Rod a={a} b={b} color={color} />
      <mesh
        position={end.clone().addScaledVector(direction, -0.15)}
        quaternion={quaternion}
      >
        <coneGeometry args={[0.1, 0.28, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  );
}

function Label({
  text,
  position,
  color = gold,
  scale = 0.42,
}: {
  text: string;
  position: Vec;
  color?: string;
  scale?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.font = "56px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 64);
    return new THREE.CanvasTexture(canvas);
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <Billboard position={position}>
      <mesh scale={[scale * 2, scale, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function Particles({
  reduced,
  low,
  bloom,
  symbol,
}: Pick<SceneProps, "reduced" | "low" | "bloom"> & { symbol: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = low ? 260 : 1100;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBloom: { value: 0 },
          uSymbol: { value: 0 },
          uFlower: { value: 0 },
        },
        vertexShader: `uniform float uTime; uniform float uBloom; uniform float uSymbol; uniform float uFlower; attribute vec3 aTarget; varying float vSeed; void main(){ vec3 p=mat3(instanceMatrix)*position; vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.); vSeed=fract(sin(ip.x*12.9898+ip.y*78.233)*43758.5453); vec3 offset=vec3(sin(uTime*.12+ip.y)*.22,cos(uTime*.1+ip.x)*.15,0.); vec3 heart=vec3(3.+.17*16.*pow(sin(vSeed*6.283),3.),.5+.17*(13.*cos(vSeed*6.283)-5.*cos(2.*vSeed*6.283)-2.*cos(3.*vSeed*6.283)-cos(4.*vSeed*6.283)),ip.z*.08); float a=vSeed*80.; float r=fract(vSeed*17.); vec3 flower=vec3(3.+cos(a)*r*1.5,sin(a)*r*1.2+.4+sin(a*5.)*.13,cos(a*5.)*.3); ip.xyz=mix(ip.xyz+offset,flower,uFlower); ip.xyz=mix(ip.xyz,heart,uBloom); ip.xyz=mix(ip.xyz,aTarget,uSymbol); gl_Position=projectionMatrix*modelViewMatrix*vec4(ip.xyz+p,1.); }`,
        fragmentShader: `varying float vSeed; void main(){ gl_FragColor=vec4(mix(vec3(.28,.75,.82),vec3(1.,.78,.53),vSeed),.2+vSeed*.45); }`,
      }),
    [],
  );
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 105px Georgia";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("20/11", 250, 120);
    const pixels = ctx.getImageData(0, 0, 500, 160).data,
      targets: number[] = [];
    for (let y = 0; y < 160; y += 3)
      for (let x = 0; x < 500; x += 3)
        if (pixels[(y * 500 + x) * 4 + 3] > 128)
          targets.push((x - 250) / 80 + 3, (80 - y) / 80, 1.5);
    const targetPositions = new Float32Array(count * 3);
    const dummy = new THREE.Object3D();
    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (random() - 0.5) * 29,
        (random() - 0.5) * 18,
        -2 - random() * 12,
      );
      dummy.scale.setScalar(0.007 + random() * 0.018);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      const j = Math.floor((random() * targets.length) / 3) * 3;
      targetPositions.set(targets.slice(j, j + 3), i * 3);
    }
    ref.current!.geometry.setAttribute(
      "aTarget",
      new THREE.InstancedBufferAttribute(targetPositions, 3),
    );
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    material.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    material.uniforms.uBloom.value = THREE.MathUtils.damp(
      material.uniforms.uBloom.value,
      bloom ? 1 : 0,
      1,
      delta,
    );
    material.uniforms.uFlower.value = THREE.MathUtils.damp(
      material.uniforms.uFlower.value,
      bloom ? 1 : 0,
      4,
      delta,
    );
    material.uniforms.uSymbol.value = THREE.MathUtils.damp(
      material.uniforms.uSymbol.value,
      symbol ? 1 : 0,
      3,
      delta,
    );
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, material, count]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
    </instancedMesh>
  );
}

function DNA({
  mode,
  reduced,
  onBase,
  miniature = false,
}: {
  mode: string;
  reduced: boolean;
  onBase: (base: string) => void;
  miniature?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const strands = useMemo(
    () =>
      [0, Math.PI].map((phase) => {
        const points = Array.from({ length: 200 }, (_, i) => {
          const y = -4 + (i * 8) / 199,
            a = y * twist;
          return new THREE.Vector3(
            Math.cos(a + phase) * 1.15,
            y,
            Math.sin(a + phase) * 1.15,
          );
        });
        return new THREE.CatmullRomCurve3(points);
      }),
    [],
  );
  useFrame(({ clock }, delta) => {
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(
        group.current.rotation.y,
        reduced ? 0.3 : clock.elapsedTime * 0.09,
        2,
        delta,
      );
      group.current.children.forEach((child) => {
        if (child.userData.strand !== undefined)
          child.position.x = THREE.MathUtils.damp(
            child.position.x,
            split ? (child.userData.strand ? 1 : -1) * 1.3 : 0,
            reduced ? 100 : 3,
            delta,
          );
      });
    }
  });
  const split = mode === "unwind" || mode === "replicate";
  return (
    <group ref={group} scale={miniature ? 0.67 : 1}>
      {[0, 1].map((s) => (
        <group key={s} userData={{ strand: s }}>
          <mesh>
            <tubeGeometry args={[strands[s], 180, 0.075, 10, false]} />
            <meshPhysicalMaterial
              color={s ? purple : cyan}
              metalness={0.5}
              roughness={0.16}
              clearcoat={1}
              emissive={s ? purple : cyan}
              emissiveIntensity={0.7}
            />
          </mesh>
          {Array.from({ length: 25 }, (_, i) => {
            const y = -3.8 + i * 0.315,
              a = y * twist + s * Math.PI;
            const base = i % 2 ? (s ? "C" : "G") : s ? "T" : "A";
            return (
              <group
                key={i}
                position={[Math.cos(a) * 1.15, y, Math.sin(a) * 1.15]}
              >
                <mesh>
                  <sphereGeometry args={[0.12, 12, 8]} />
                  <meshPhysicalMaterial
                    color={i % 3 ? "#d8b6d4" : gold}
                    metalness={0.65}
                    roughness={0.15}
                  />
                </mesh>
                <group
                  rotation={[0, -a, 0]}
                  position={[-Math.cos(a) * 0.48, 0, -Math.sin(a) * 0.48]}
                >
                  <mesh
                    onClick={(e) => {
                      e.stopPropagation();
                      onBase(base);
                    }}
                    onPointerOver={() => {
                      document.body.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                      document.body.style.cursor = "";
                    }}
                  >
                    <boxGeometry args={[0.83, 0.15, 0.13]} />
                    <meshStandardMaterial
                      color={
                        base === "A"
                          ? cyan
                          : base === "T"
                            ? gold
                            : base === "G"
                              ? purple
                              : "#66b8eb"
                      }
                      emissive={base === "A" ? cyan : purple}
                      emissiveIntensity={0.3}
                      metalness={0.45}
                      roughness={0.25}
                    />
                  </mesh>
                </group>
                {i % 4 === 0 && (
                  <Label
                    text={base}
                    position={[-Math.cos(a) * 0.43, 0.13, -Math.sin(a) * 0.43]}
                    color={
                      base === "A" ? cyan : base === "T" ? gold : "#c8b6ef"
                    }
                    scale={0.25}
                  />
                )}
              </group>
            );
          })}
        </group>
      ))}
      {!split &&
        Array.from({ length: 25 }, (_, i) => {
          const y = -3.8 + i * 0.315,
            a = y * twist;
          return (
            <group key={i} position={[0, y, 0]} rotation={[0, -a, 0]}>
              {Array.from({ length: i % 2 ? 3 : 2 }, (_, j) => (
                <Rod
                  key={j}
                  a={[-0.2, (j - (i % 2 ? 1 : 0.5)) * 0.045, 0]}
                  b={[0.2, (j - (i % 2 ? 1 : 0.5)) * 0.045, 0]}
                  color={gold}
                  radius={0.009}
                />
              ))}
            </group>
          );
        })}
      {mode === "replicate" &&
        [-1, 1].map((side, s) => (
          <group key={side} position={[side * 1.3, 0, 0]}>
            <mesh>
              <tubeGeometry args={[strands[s ? 0 : 1], 180, 0.05, 8, false]} />
              <meshStandardMaterial
                color={pink}
                emissive={pink}
                emissiveIntensity={0.4}
                metalness={0.3}
                roughness={0.3}
              />
            </mesh>
            {Array.from({ length: 25 }, (_, i) => {
              const y = -3.8 + i * 0.315,
                a = y * twist + (s ? 0 : Math.PI);
              return (
                <group key={i}>
                  <mesh position={[Math.cos(a) * 1.15, y, Math.sin(a) * 1.15]}>
                    <sphereGeometry args={[0.09, 10, 8]} />
                    <meshStandardMaterial
                      color={pink}
                      emissive={pink}
                      emissiveIntensity={0.4}
                    />
                  </mesh>
                  <Rod
                    a={[Math.cos(a) * 1.15, y, Math.sin(a) * 1.15]}
                    b={[0, y, 0]}
                    color={pink}
                    radius={0.035}
                  />
                </group>
              );
            })}
            <Label text="5′ → 3′" position={[0, 3.4, 0]} color={pink} />
          </group>
        ))}
      <Label text="5′" position={[1.5, 4, 0]} />
      <Label text="3′" position={[-1.5, 4, 0]} />
      <Label text="3′" position={[1.5, -4, 0]} />
      <Label text="5′" position={[-1.5, -4, 0]} />
    </group>
  );
}

function petalGeometry(layer: number) {
  const geometry = new THREE.BufferGeometry(),
    positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const seg = 20;
  for (let y = 0; y <= seg; y++)
    for (let x = 0; x <= seg; x++) {
      const u = x / seg,
        t = y / seg,
        angle = (u - 0.5) * 1.9;
      const radius = (0.06 + t * 0.54) * (1 + layer * 0.21);
      positions.push(
        Math.sin(angle) * radius,
        t * (0.72 - 0.22 * Math.pow(Math.abs(u - 0.5) * 2, 2)) -
          Math.pow(t, 3) * (0.15 + layer * 0.075) +
          Math.sin(u * Math.PI * 3) * Math.pow(t, 4) * 0.045,
        Math.cos(angle) * radius - 0.06 + Math.pow(t, 3) * 0.07,
      );
      uvs.push(u, t);
      if (y < seg && x < seg) {
        const a = y * (seg + 1) + x;
        indices.push(a, a + 1, a + seg + 1, a + 1, a + seg + 2, a + seg + 1);
      }
    }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Rose({
  position,
  size = 1,
  reduced,
  blooming,
}: {
  position: Vec;
  size?: number;
  reduced: boolean;
  blooming: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const petals = useMemo(() => [0, 1, 2, 3, 4, 5].map(petalGeometry), []);
  useEffect(() => () => petals.forEach((g) => g.dispose()), [petals]);
  useFrame(({ clock }, delta) => {
    if (ref.current) {
      const target = blooming ? 1 : 0.76;
      ref.current.scale.lerp(
        new THREE.Vector3(target, target, target),
        reduced ? 1 : Math.min(1, delta * 1.8),
      );
      if (!reduced)
        ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.08;
      ref.current.children.forEach((child) => {
        const layer = child.userData.petalLayer;
        if (layer !== undefined)
          child.rotation.x = THREE.MathUtils.damp(
            child.rotation.x,
            layer * 0.025 + ((blooming ? 0 : -0.5) * layer) / 5,
            reduced ? 100 : 1.8,
            delta,
          );
      });
    }
  });
  return (
    <group position={position} scale={size} rotation={[0.55, 0.2, -0.1]}>
      <Rod
        a={[0, -2.3, 0]}
        b={[0, 0, 0]}
        color="#467264"
        radius={0.035}
        glow={0}
      />
      <group ref={ref}>
        <mesh position={[0, 0.28, 0]} scale={[0.15, 0.3, 0.15]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#d77c96" roughness={0.55} />
        </mesh>
        {petals.map((geometry, layer) =>
          Array.from({ length: 4 + layer }, (_, i) => (
            <mesh
              key={`${layer}-${i}`}
              userData={{ petalLayer: layer }}
              geometry={geometry}
              rotation={[
                layer * 0.025,
                (i * Math.PI * 2) / (4 + layer) + layer * 1.3,
                Math.cos(i * 2) * 0.07,
              ]}
              position={[0, -0.035 * layer, 0]}
              scale={[1, 0.95 + Math.cos(i * 2) * 0.12, 1]}
            >
              <meshPhysicalMaterial
                color={
                  layer < 2 ? "#d77c96" : layer < 4 ? "#eaa0b3" : "#f2b8c4"
                }
                roughness={0.44}
                metalness={0.02}
                side={THREE.DoubleSide}
                clearcoat={0.2}
              />
            </mesh>
          )),
        )}
      </group>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.4, -1.2, 0]}
          rotation={[0.5, 0.2, s * -0.8]}
          scale={[0.24, 0.65, 0.05]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color="#497a62"
            metalness={0.2}
            roughness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0.4, 0.2, 0.48]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshPhysicalMaterial
          color="#fff"
          transmission={0.9}
          roughness={0.05}
          thickness={0.1}
        />
      </mesh>
    </group>
  );
}

function Bouquet({ bloom, reduced }: { bloom: boolean; reduced: boolean }) {
  return (
    <group>
      {[
        [-0.8, 0.4, 0.1],
        [0.55, 0.65, -0.15],
        [0.1, -0.3, 0.65],
        [-1, -0.7, 0.5],
        [1, -0.5, 0.3],
      ].map((p, i) => (
        <Rose
          key={i}
          position={p as Vec}
          size={i === 2 ? 1.05 : 0.8}
          reduced={reduced}
          blooming={bloom}
        />
      ))}
      <mesh position={[0, -2.1, -0.1]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[1.55, 2.7, 7, 1, true]} />
        <meshPhysicalMaterial
          color="#b9808e"
          roughness={0.6}
          side={THREE.DoubleSide}
          metalness={0.15}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.4, -2.4, 0.65]}
          rotation={[0, s * 0.4, s * 0.5]}
          scale={[0.65, 0.3, 0.15]}
        >
          <torusGeometry args={[0.55, 0.14, 8, 28]} />
          <meshPhysicalMaterial color={pink} roughness={0.25} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -2.4, 0.7]} scale={[0.23, 0.18, 0.18]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={pink} metalness={0.6} roughness={0.2} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const x = Math.sin(i * 7) * 1.6,
          y = Math.cos(i * 3) * 0.6;
        return (
          <group key={i}>
            <Rod
              a={[0, -2, -0.3]}
              b={[x, y + 0.7, -0.3]}
              color="#839373"
              radius={0.015}
              glow={0}
            />
            {Array.from({ length: 3 }, (_, j) => (
              <mesh
                key={j}
                position={[
                  x + Math.sin(j * 2) * 0.11,
                  y + 0.7 + j * 0.08,
                  -0.3,
                ]}
              >
                <sphereGeometry args={[0.055, 7, 5]} />
                <meshStandardMaterial color="#f3e6d6" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function Letter({
  animate = false,
  reduced = false,
}: {
  animate?: boolean;
  reduced?: boolean;
}) {
  const paper = useRef<THREE.Group>(null),
    flap = useRef<THREE.Group>(null),
    started = useRef<number | null>(null);
  const triangle = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.65, 0);
    shape.lineTo(1.65, 0);
    shape.lineTo(0, -1.2);
    shape.closePath();
    return shape;
  }, []);
  useFrame(({ clock }, delta) => {
    if (started.current === null) started.current = clock.elapsedTime;
    const open =
      !animate || reduced || clock.elapsedTime - started.current > 0.7;
    if (paper.current)
      paper.current.position.y = THREE.MathUtils.damp(
        paper.current.position.y,
        open ? 0 : -1.7,
        2,
        delta,
      );
    if (flap.current)
      flap.current.rotation.x = THREE.MathUtils.damp(
        flap.current.rotation.x,
        open ? -Math.PI : 0,
        3,
        delta,
      );
  });
  return (
    <group rotation={[0.06, -0.14, -0.09]}>
      <group ref={paper} position={[0, animate ? -1.7 : 0, -0.1]}>
        <mesh position={[0, 0.5, -0.1]}>
          <boxGeometry args={[2.9, 3.8, 0.045]} />
          <meshStandardMaterial color="#f2dcca" roughness={0.8} />
        </mesh>
        <Label
          text="20 / 11"
          position={[0, 1.5, 0]}
          color="#a78356"
          scale={0.6}
        />
        {[0.95, 0.6, 0.25].map((y) => (
          <Rod
            key={y}
            a={[-1, y, 0]}
            b={[1, y, 0]}
            color="#be9f80"
            radius={0.008}
            glow={0}
          />
        ))}
      </group>
      <group
        ref={flap}
        position={[0, 0.4, -0.25]}
        rotation={[animate ? 0 : -Math.PI, 0, 0]}
      >
        <mesh>
          <shapeGeometry args={[triangle]} />
          <meshStandardMaterial
            color="#be8797"
            side={THREE.DoubleSide}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      </group>
      <mesh position={[0, -0.6, 0.05]}>
        <boxGeometry args={[3.3, 2, 0.08]} />
        <meshStandardMaterial
          color="#cc94a2"
          roughness={0.55}
          metalness={0.15}
        />
      </mesh>
      <Rod a={[-1.65, 0.4, 0.15]} b={[0, -0.8, 0.15]} radius={0.018} />
      <Rod a={[1.65, 0.4, 0.15]} b={[0, -0.8, 0.15]} radius={0.018} />
      <mesh position={[0, -0.8, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.09, 32]} />
        <meshStandardMaterial color={gold} metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function filmGeometry(curve: THREE.CatmullRomCurve3) {
  const geo = new THREE.BufferGeometry(),
    pos: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 180; i++) {
    const t = i / 180,
      p = curve.getPoint(t),
      tangent = curve.getTangent(t),
      normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    for (const side of [-1, 1]) {
      const point = p.clone().addScaledVector(normal, side * 0.65);
      pos.push(point.x, point.y, point.z);
      uv.push(t, (side + 1) / 2);
    }
    if (i < 180) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Film({
  photos,
  onPhoto,
  memories,
  reduced,
}: Pick<SceneProps, "photos" | "onPhoto" | "reduced"> & { memories: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        v([-10, 0.7, -2]),
        v([-6, -1, -0.7]),
        v([-2, -0.2, 0.3]),
        v([2, -0.6, -0.5]),
        v([6, 1.2, -2]),
        v([10, 0.6, -3]),
      ]),
    [],
  );
  const geometry = useMemo(() => filmGeometry(curve), [curve]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#b9a08e";
    ctx.fillRect(0, 0, 4096, 320);
    for (let i = 0; i < 100; i++) {
      ctx.clearRect(i * 41 + 8, 10, 22, 24);
      ctx.clearRect(i * 41 + 8, 286, 22, 24);
    }
    for (let i = 0; i < 10; i++) {
      const x = i * 410 + 12,
        gradient = ctx.createLinearGradient(x, 45, x + 380, 275);
      gradient.addColorStop(0, "#243b43");
      gradient.addColorStop(0.5, "#566469");
      gradient.addColorStop(1, "#a28f87");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, 45, 385, 230);
      ctx.strokeStyle = "#e9c89c";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 5, 50, 375, 220);
      ctx.fillStyle = "#d9c5b0";
      ctx.font = "italic 40px Georgia";
      ctx.textAlign = "center";
      ctx.fillText("20 / 11", x + 192, 158);
      ctx.font = "15px Georgia";
      ctx.fillText("A MEMORY TO KEEP", x + 192, 193);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => {
    let cancelled = false;
    photos.forEach((src, i) => {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
        for (let frame = i; frame < 10; frame += photos.length) {
          const aspect = image.width / image.height,
            target = 385 / 230;
          const sw = aspect > target ? image.height * target : image.width,
            sh = aspect > target ? image.height : image.width / target;
          ctx.drawImage(
            image,
            (image.width - sw) / 2,
            (image.height - sh) / 2,
            sw,
            sh,
            frame * 410 + 12,
            45,
            385,
            230,
          );
        }
        texture.needsUpdate = true;
      };
      image.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [photos, texture]);
  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );
  useFrame(({ clock }, delta) => {
    if (ref.current) {
      const section = document.getElementById("memories");
      const scroll = section
        ? THREE.MathUtils.clamp(
            -section.getBoundingClientRect().top / section.offsetHeight,
            -0.5,
            0.7,
          )
        : 0;
      ref.current.position.x = THREE.MathUtils.damp(
        ref.current.position.x,
        memories && !reduced ? -scroll * 6 - 1 : -2,
        2,
        delta,
      );
      ref.current.rotation.z = reduced
        ? 0
        : Math.sin(clock.elapsedTime * 0.12) * 0.035;
    }
  });
  return (
    <group ref={ref}>
      <mesh
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onPhoto(Math.floor((e.uv?.x || 0) * 10) % Math.max(photos.length, 4));
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
          metalness={0.45}
          roughness={0.32}
        />
      </mesh>
    </group>
  );
}

function Cell({ position, scale = 1 }: { position: Vec; scale?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
        uniforms: { uColor: { value: new THREE.Color(cyan) } },
        vertexShader:
          "varying vec3 vNormal; varying vec3 vEye; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "uniform vec3 uColor; varying vec3 vNormal; varying vec3 vEye; void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),2.4);gl_FragColor=vec4(uColor,f*.45+.025);}",
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={position} scale={scale}>
      <mesh material={material} scale={[1.35, 1, 0.7]}>
        <sphereGeometry args={[1.5, 36, 24]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.45, 20, 16]} />
        <meshPhysicalMaterial
          color={purple}
          roughness={0.25}
          metalness={0.45}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh>
        <torusKnotGeometry args={[0.23, 0.018, 100, 6, 3, 5]} />
        <meshStandardMaterial
          color={pink}
          emissive={pink}
          emissiveIntensity={0.5}
        />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 3) * 1.1, Math.cos(i * 3) * 0.85, 0.1]}
          rotation={[0, 0, i]}
          scale={[0.3, 0.13, 0.13]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial
            color={i % 2 ? "#64987a" : "#568f9b"}
            emissive={cyan}
            emissiveIntensity={0.12}
            metalness={0.45}
            roughness={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

function Exhibit({
  id,
  reduced,
  onBase,
}: {
  id: string;
  reduced: boolean;
  onBase: SceneProps["onBase"];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !reduced) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.3;
      if (id === "division")
        ref.current.children.forEach((child) => {
          if (child.userData.side)
            child.position.x =
              child.userData.side *
              (1.1 + (Math.sin(clock.elapsedTime * 0.5) + 1) * 0.45);
        });
    }
  });
  if (id === "dna" || id === "replication")
    return (
      <DNA
        mode={id === "replication" ? "replicate" : "normal"}
        reduced={reduced}
        onBase={onBase}
        miniature
      />
    );
  return (
    <group ref={ref}>
      {id === "nucleosome" && (
        <>
          <mesh>
            <sphereGeometry args={[1, 24, 18]} />
            <meshPhysicalMaterial
              color={purple}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.sin(i) * 0.75,
                Math.cos(i) * 0.75,
                ((i % 2) - 0.5) * 0.8,
              ]}
            >
              <sphereGeometry args={[0.4, 16, 12]} />
              <meshStandardMaterial color={i % 2 ? pink : purple} />
            </mesh>
          ))}
          <mesh>
            <tubeGeometry
              args={[
                new THREE.CatmullRomCurve3(
                  Array.from({ length: 180 }, (_, i) => {
                    const t = i / 179;
                    return v([
                      Math.sin(t * Math.PI * 3.3) * 1.25,
                      (t - 0.5) * 1.4,
                      Math.cos(t * Math.PI * 3.3) * 1.25,
                    ]);
                  }),
                ),
                180,
                0.055,
                8,
                false,
              ]}
            />
            <meshStandardMaterial
              color={cyan}
              emissive={cyan}
              emissiveIntensity={0.4}
            />
          </mesh>
        </>
      )}
      {(id === "chromosome" || id === "division") &&
        [0, 1].map((i) => (
          <group
            key={i}
            userData={{ side: i ? 1 : -1 }}
            position={[id === "division" ? (i ? 1.3 : -1.3) : 0, 0, i * 0.2]}
            rotation={[0, 0, (i ? -1 : 1) * 0.45]}
          >
            <Rod
              a={[0, -1.8, 0]}
              b={[0, 1.8, 0]}
              color={i ? purple : cyan}
              radius={0.25}
            />
            <mesh>
              <sphereGeometry args={[0.28, 16, 12]} />
              <meshStandardMaterial color={gold} />
            </mesh>
          </group>
        ))}
      {(id === "transcription" || id === "translation") && (
        <>
          <Rod a={[-3, 0, 0]} b={[3, 0, 0]} color={cyan} radius={0.035} />
          {(id === "transcription"
            ? ["A", "U", "G", "C", "C", "U"]
            : ["A", "U", "G", "C", "C", "U", "U", "A", "A"]
          ).map((b, i) => (
            <group key={i} position={[-2.7 + i * 0.65, 0, 0]}>
              <Rod
                a={[0, 0, 0]}
                b={[0, 0.4, 0]}
                color={i < 3 ? gold : purple}
                radius={0.07}
              />
              <Label text={b} position={[0, 0.7, 0]} scale={0.24} />
            </group>
          ))}
          <Label text="5′" position={[-3.3, 0, 0]} />
          <Label text="3′" position={[3.3, 0, 0]} />
          <mesh position={[-1.1, -0.2, -0.3]} scale={[1.2, 0.7, 0.7]}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshPhysicalMaterial
              color={purple}
              transparent
              opacity={0.55}
              roughness={0.4}
            />
          </mesh>
          <Label
            text={id === "translation" ? "Ribosome" : "RNA polymerase"}
            position={[-1.1, -1.3, 0]}
            scale={0.5}
          />
          {id === "translation" && (
            <>
              <Rod a={[-1.3, 1, 0]} b={[-1.3, 1.8, 0]} color={pink} />
              <Rod a={[-1.3, 1.8, 0]} b={[-1.6, 2.1, 0]} color={pink} />
              {Array.from({ length: 4 }, (_, i) => (
                <mesh
                  key={i}
                  position={[-1.6 + i * 0.4, 2.2 + Math.sin(i) * 0.3, 0]}
                >
                  <sphereGeometry args={[0.18, 16, 12]} />
                  <meshStandardMaterial color={i % 2 ? pink : gold} />
                </mesh>
              ))}
              <Label text="tRNA" position={[-2.3, 1.5, 0]} scale={0.4} />
            </>
          )}
          {id === "transcription" && (
            <>
              <Rod a={[-3, 1.7, -0.5]} b={[3, 1.7, -0.5]} color={gold} />
              <Label
                text="3′–TAC GGA–5′"
                position={[0.3, 2.2, 0]}
                scale={0.7}
              />
              <Label text="ADN → RNA" position={[0, -2, 0]} scale={0.7} />
            </>
          )}
        </>
      )}
      {id === "mendel" && (
        <>
          {["AA", "Aa", "Aa", "aa"].map((text, i) => (
            <group
              key={i}
              position={[
                ((i % 2) - 0.5) * 1.7,
                (Math.floor(i / 2) - 0.5) * 1.7,
                0,
              ]}
            >
              <mesh>
                <sphereGeometry args={[0.65, 24, 16]} />
                <meshPhysicalMaterial
                  color={i === 3 ? pink : cyan}
                  roughness={0.3}
                  metalness={0.3}
                  transparent
                  opacity={0.4}
                />
              </mesh>
              <Label text={text} position={[0, 0, 0.7]} scale={0.5} />
            </group>
          ))}
          <Label text="Aa × Aa" position={[0, 2.2, 0]} scale={0.8} />
        </>
      )}
      {id === "evolution" && (
        <>
          {Array.from({ length: 7 }, (_, i) => {
            const level = i < 1 ? 0 : i < 3 ? 1 : 2;
            const x =
              level === 0
                ? 0
                : level === 1
                  ? i === 1
                    ? -1.5
                    : 1.5
                  : (i - 4.5) * 1.5;
            const y = -2 + level * 1.8;
            const parentX = level === 1 ? 0 : i < 5 ? -1.5 : 1.5;
            return (
              <group key={i}>
                <mesh position={[x, y, 0]}>
                  <sphereGeometry args={[0.22, 16, 12]} />
                  <meshStandardMaterial
                    color={level === 2 ? cyan : gold}
                    emissive={cyan}
                    emissiveIntensity={0.25}
                  />
                </mesh>
                {i > 0 && (
                  <Rod a={[parentX, y - 1.8, 0]} b={[x, y, 0]} color={cyan} />
                )}
              </group>
            );
          })}
        </>
      )}
      {id === "ecosystem" && (
        <>
          {[
            [-2.5, 1, 0],
            [-0.7, 1, 0],
            [1.2, 1, 0],
            [3, 1, 0],
            [0.5, -1.2, 0],
          ].map((p, i) => (
            <group key={i}>
              <mesh position={p as Vec}>
                <sphereGeometry args={[0.3, 20, 16]} />
                <meshStandardMaterial
                  color={
                    i === 0
                      ? gold
                      : i === 1
                        ? "#83ba7c"
                        : i === 4
                          ? purple
                          : cyan
                  }
                  emissive={cyan}
                  emissiveIntensity={0.15}
                />
              </mesh>
              <Label
                text={["Ánh sáng", "Cỏ", "Châu chấu", "Chim", "Phân giải"][i]}
                position={[p[0], p[1] + 0.6, 0]}
                scale={0.42}
              />
            </group>
          ))}
          {[
            [
              [-2.1, 1, 0],
              [-1.1, 1, 0],
            ],
            [
              [-0.3, 1, 0],
              [0.8, 1, 0],
            ],
            [
              [1.6, 1, 0],
              [2.6, 1, 0],
            ],
            [
              [-0.6, 0.6, 0],
              [0.3, -0.8, 0],
            ],
            [
              [2.7, 0.6, 0],
              [0.8, -0.9, 0],
            ],
          ].map(([a, b], i) => (
            <Arrow
              key={i}
              a={a as Vec}
              b={b as Vec}
              color={i === 0 ? gold : cyan}
            />
          ))}
          <Label
            text="Dòng năng lượng và vật chất"
            position={[0.3, -2.2, 0]}
            scale={0.8}
          />
        </>
      )}
    </group>
  );
}

function World(props: SceneProps) {
  const {
    chapter,
    reduced,
    low,
    dnaMode,
    exhibit,
    bloom,
    photos,
    zoom,
    resetView,
    intro,
    onIntroEnd,
    onPhoto,
    onBase,
    onReady,
  } = props;
  const { viewport, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const [symbol, setSymbol] = useState(false);
  const mobile = viewport.width < 9;
  useEffect(() => {
    onReady();
  }, [onReady]);
  useEffect(() => {
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);
  }, [chapter, camera, resetView]);
  useEffect(() => {
    if (chapter !== 1 || reduced) return;
    setSymbol(true);
    const timer = window.setTimeout(() => setSymbol(false), 2600);
    return () => window.clearTimeout(timer);
  }, [chapter, reduced]);
  useEffect(() => {
    if (!intro) return;
    const cellX = -10.2 + (mobile ? 0 : Math.min(3, viewport.width * 0.19));
    const timeline = gsap.timeline({ onComplete: onIntroEnd });
    timeline
      .to(lookTarget.current, { x: cellX, y: 3.8, z: -3, duration: 2 }, 0)
      .to(
        camera.position,
        { x: cellX + 2.1, y: 2.6, z: 3, duration: 2.5, ease: "power2.inOut" },
        0,
      )
      .to(camera.position, {
        x: cellX + 0.1,
        y: 3.8,
        z: -1.8,
        duration: 2.3,
        ease: "power1.inOut",
      })
      .to(camera.position, { x: cellX, y: 3.8, z: -2.9, duration: 1.2 })
      .to(lookTarget.current, { x: 0, y: 0, z: 0, duration: 1.2 })
      .to(
        camera.position,
        { x: 0, y: 0, z: 12, duration: 1.5, ease: "power2.inOut" },
        "<",
      );
    return () => {
      timeline.kill();
      camera.position.set(0, 0, 12);
      camera.lookAt(0, 0, 0);
    };
  }, [intro, camera, onIntroEnd, mobile, viewport.width]);
  useFrame(({ pointer }, delta) => {
    if (intro) camera.lookAt(lookTarget.current);
    else if (!reduced && chapter !== 1 && chapter !== 2) {
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        pointer.x * 0.12,
        2,
        delta,
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        pointer.y * 0.1,
        2,
        delta,
      );
    }
    if (group.current) {
      const targetX = mobile ? 0 : Math.min(3, viewport.width * 0.19);
      group.current.position.x = THREE.MathUtils.damp(
        group.current.position.x,
        targetX,
        3,
        delta,
      );
    }
    if (group.current)
      group.current.scale.setScalar(
        THREE.MathUtils.damp(
          group.current.scale.x,
          chapter === 1 || chapter === 2 ? zoom : 1,
          4,
          delta,
        ),
      );
  });
  return (
    <>
      <color attach="background" args={["#06111f"]} />
      <fog attach="fog" args={["#06111f", 13, 30]} />
      <ambientLight intensity={0.8} color="#acc5dc" />
      <directionalLight position={[-4, 7, 6]} intensity={3.2} color="#fce2c6" />
      <pointLight
        position={[4, 2, 3]}
        intensity={26}
        color="#ad8ceb"
        distance={14}
      />
      <pointLight
        position={[-5, -2, 4]}
        intensity={20}
        color={cyan}
        distance={13}
      />
      <Particles
        reduced={reduced}
        low={low}
        bloom={bloom && chapter >= 4}
        symbol={symbol && chapter === 1}
      />
      <group ref={group} position={[mobile ? 0 : 2.8, 0, 0]}>
        {chapter === 0 && (
          <>
            <group
              position={mobile ? [0.8, -2.2, -1.5] : [-1.1, 0.2, -0.1]}
              rotation={[0.02, -0.2, -0.18]}
              scale={mobile ? 0.5 : 0.9}
            >
              <DNA mode="normal" reduced={reduced} onBase={onBase} />
            </group>
            {!mobile && (
              <>
                <group position={[3.1, -0.05, -1.1]} scale={0.85}>
                  <Letter />
                </group>
                <group position={[3.05, -1.85, 0.3]} scale={0.79}>
                  <Bouquet bloom reduced={reduced} />
                </group>
              </>
            )}
            <group
              position={[-3.8, -2.6, -1.6]}
              rotation={[0, 0, -0.1]}
              scale={0.8}
            >
              <Film
                photos={photos}
                onPhoto={onPhoto}
                memories={false}
                reduced={reduced}
              />
            </group>
            <Cell position={[-10.2, 3.8, -3]} scale={1.7} />
            <Cell position={[-9.2, -5, -2.5]} scale={2} />
            {!mobile && (
              <group
                position={[4, 3.2, -3]}
                rotation={[0, 0, -0.3]}
                scale={0.35}
              >
                <Exhibit id="chromosome" reduced={reduced} onBase={onBase} />
              </group>
            )}
          </>
        )}
        {chapter === 1 && (
          <DNA mode={dnaMode} reduced={reduced} onBase={onBase} />
        )}
        {chapter === 2 && (
          <Exhibit id={exhibit} reduced={reduced} onBase={onBase} />
        )}
        {chapter === 3 && (
          <group position={[-2, -1.3, 1]} rotation={[0, 0, 0.13]}>
            <Film
              photos={photos}
              onPhoto={onPhoto}
              memories
              reduced={reduced}
            />
          </group>
        )}
        {chapter === 4 && (
          <group position={[0, 0.2, 0]} scale={1.25}>
            <Bouquet bloom={bloom} reduced={reduced} />
          </group>
        )}
        {chapter === 5 && (
          <group position={[0, 0, 0]} scale={1.4}>
            <Letter animate reduced={reduced} />
          </group>
        )}
      </group>
      {(chapter === 1 || chapter === 2) && !mobile && (
        <OrbitControls
          key={resetView}
          enablePan={false}
          enableZoom={false}
          target={[0, 0, 0]}
        />
      )}
      {!low && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.45}
            luminanceThreshold={1.1}
            luminanceSmoothing={0.5}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    if (!canvas.getContext("webgl2")) {
      setFailed(true);
      props.onReady();
    }
  }, [props.onReady]);
  if (failed)
    return (
      <div className="webgl-fallback">
        <div className="fallback-orbit">✧</div>
        <p>
          Thiết bị đang hiển thị chế độ nhẹ.
          <br />
          Bạn vẫn có thể khám phá toàn bộ nội dung tri ân.
        </p>
      </div>
    );
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 43 }}
      dpr={props.low ? 1 : [1, 1.7]}
      gl={{
        antialias: !props.low,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setFailed(true);
          props.onReady();
        });
      }}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
