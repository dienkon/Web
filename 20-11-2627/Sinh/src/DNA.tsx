import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

type Base = "A" | "T" | "G" | "C";
type DNAProps = {
  mode: string;
  reduced: boolean;
  onBase: (base: string) => void;
  miniature?: boolean;
};
const colors: Record<Base, string> = {
  A: "#49d9e4",
  T: "#edbd89",
  G: "#ad88ec",
  C: "#7ba9ec",
};
const sequence: Base[] = [
  "A",
  "G",
  "C",
  "A",
  "T",
  "G",
  "A",
  "C",
  "G",
  "T",
  "A",
  "G",
  "C",
  "T",
  "A",
  "C",
  "G",
  "A",
  "T",
  "G",
  "C",
  "A",
  "G",
  "T",
  "C",
  "A",
];
const complement: Record<Base, Base> = { A: "T", T: "A", G: "C", C: "G" };
const spacing = 0.31;
const halfHeight = ((sequence.length - 1) * spacing) / 2;
// B-DNA: right-handed helix, 10.5 base pairs / turn, antiparallel strands.
const twist = (-Math.PI * 2) / (spacing * 10.5);

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private phase: number,
    private radius = 1.08,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const y = (t - 0.5) * (halfHeight * 2 + 0.3);
    const angle = y * twist + this.phase;
    return target.set(
      Math.cos(angle) * this.radius,
      y,
      Math.sin(angle) * this.radius,
    );
  }
}

function baseGeometry() {
  // Smooth bevels share a single geometry; base ends meet the backbone exactly.
  const shape = new THREE.Shape();
  const x = -0.39,
    y = -0.057,
    w = 0.78,
    h = 0.114,
    r = 0.052;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 12,
  });
  geo.translate(0, 0, -0.0475);
  geo.computeVertexNormals();
  return geo;
}

function Glyph({
  text,
  position,
  color = "#f0dac0",
  size = 0.22,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  size?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "italic 56px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, 96, 49);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <Billboard position={position}>
      <mesh scale={[size * 2, size, 1]}>
        <planeGeometry />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

function Strand({
  side,
  offset,
  fresh = false,
  reduced,
  geometry,
  onBase,
}: {
  side: number;
  offset: number;
  fresh?: boolean;
  reduced: boolean;
  geometry: THREE.ExtrudeGeometry;
  onBase: DNAProps["onBase"];
}) {
  const ref = useRef<THREE.Group>(null);
  const backbone = useMemo(
    () =>
      new THREE.TubeGeometry(
        new HelixCurve(side * Math.PI),
        640,
        0.085,
        16,
        false,
      ),
    [side],
  );
  const highlight = useMemo(
    () =>
      new THREE.TubeGeometry(
        new HelixCurve(side * Math.PI + 0.035, 1.095),
        480,
        0.012,
        6,
        false,
      ),
    [side],
  );
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: fresh ? "#eea9c8" : side ? "#a18ad9" : "#72d7e8",
        metalness: 0.28,
        roughness: 0.19,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        emissive: fresh ? "#9e4b77" : side ? "#483083" : "#176579",
        emissiveIntensity: 0.5,
        iridescence: 0.35,
        iridescenceIOR: 1.3,
      }),
    [side, fresh],
  );
  const baseMaterials = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(colors).map(([key, color]) => [
          key,
          new THREE.MeshPhysicalMaterial({
            color: fresh ? "#e6adc6" : color,
            metalness: 0.18,
            roughness: 0.28,
            clearcoat: 0.8,
            emissive: fresh ? "#b66a8d" : color,
            emissiveIntensity: 0.16,
          }),
        ]),
      ) as Record<Base, THREE.MeshPhysicalMaterial>,
    [fresh],
  );
  useEffect(
    () => () => {
      backbone.dispose();
      highlight.dispose();
      material.dispose();
      Object.values(baseMaterials).forEach((m) => m.dispose());
    },
    [backbone, highlight, material, baseMaterials],
  );
  useFrame((_, delta) => {
    if (ref.current)
      ref.current.position.x = reduced
        ? offset
        : THREE.MathUtils.damp(ref.current.position.x, offset, 3.2, delta);
  });
  return (
    <group ref={ref}>
      <mesh geometry={backbone} material={material} />
      <mesh geometry={highlight}>
        <meshBasicMaterial
          color={fresh ? "#f4cfdb" : side ? "#dfc6fc" : "#bbf5f1"}
          toneMapped={false}
        />
      </mesh>
      {sequence.map((letter, i) => {
        const base = side ? complement[letter] : letter;
        const y = -halfHeight + i * spacing,
          angle = y * twist + side * Math.PI;
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, -angle, 0]}>
            <mesh
              geometry={geometry}
              material={baseMaterials[base]}
              position={[0.57, 0, 0]}
              onClick={(event) => {
                event.stopPropagation();
                onBase(base);
              }}
              onPointerOver={() => {
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "";
              }}
            />
            <mesh position={[0.975, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.027, 0.027, 0.19, 10]} />
              <meshStandardMaterial
                color={fresh ? "#edbbd1" : colors[base]}
                metalness={0.3}
                roughness={0.25}
              />
            </mesh>
            {!fresh && i % 5 === 2 && (
              <Glyph
                text={base}
                position={[0.55, 0.12, 0.08]}
                color={base === "T" ? "#ffe1b5" : "#d3e6ff"}
                size={0.19}
              />
            )}
          </group>
        );
      })}
      <Glyph
        text={side ? "3′" : "5′"}
        position={[
          Math.cos((halfHeight + 0.15) * twist + side * Math.PI) * 1.23,
          halfHeight + 0.3,
          Math.sin((halfHeight + 0.15) * twist + side * Math.PI) * 1.23,
        ]}
        size={0.26}
      />
      <Glyph
        text={side ? "5′" : "3′"}
        position={[
          Math.cos((-halfHeight - 0.15) * twist + side * Math.PI) * 1.23,
          -halfHeight - 0.3,
          Math.sin((-halfHeight - 0.15) * twist + side * Math.PI) * 1.23,
        ]}
        size={0.26}
      />
    </group>
  );
}

function HydrogenBonds({ offset = 0 }: { offset?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = sequence.reduce(
    (n, b) => n + (b === "A" || b === "T" ? 2 : 3),
    0,
  );
  useEffect(() => {
    const dummy = new THREE.Object3D();
    let index = 0;
    sequence.forEach((base, i) => {
      const bonds = base === "A" || base === "T" ? 2 : 3,
        y = -halfHeight + i * spacing,
        a = y * twist;
      for (let j = 0; j < bonds; j++) {
        dummy.position.set(offset, y + (j - (bonds - 1) / 2) * 0.04, 0);
        dummy.rotation.set(0, -a, Math.PI / 2);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(index++, dummy.matrix);
      }
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
  }, [count, offset]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <cylinderGeometry args={[0.009, 0.009, 0.28, 6]} />
      <meshStandardMaterial
        color="#e5d8c0"
        emissive="#e5d8c0"
        emissiveIntensity={0.38}
        roughness={0.5}
      />
    </instancedMesh>
  );
}

export default function DNA({
  mode,
  reduced,
  onBase,
  miniature = false,
}: DNAProps) {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(baseGeometry, []);
  const split = mode === "unwind" || mode === "replicate";
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    if (ref.current && !reduced)
      ref.current.rotation.y += Math.min(delta, 0.05) * 0.075;
  });
  return (
    <group ref={ref} rotation={[0, 0.35, 0]} scale={miniature ? 0.68 : 1}>
      <Strand
        side={0}
        offset={split ? -1.32 : 0}
        geometry={geometry}
        reduced={reduced}
        onBase={onBase}
      />
      <Strand
        side={1}
        offset={split ? 1.32 : 0}
        geometry={geometry}
        reduced={reduced}
        onBase={onBase}
      />
      {!split && <HydrogenBonds />}
      {mode === "replicate" && (
        <>
          <Strand
            side={1}
            offset={-1.32}
            geometry={geometry}
            fresh
            reduced={reduced}
            onBase={onBase}
          />
          <Strand
            side={0}
            offset={1.32}
            geometry={geometry}
            fresh
            reduced={reduced}
            onBase={onBase}
          />
          <HydrogenBonds offset={-1.32} />
          <HydrogenBonds offset={1.32} />
        </>
      )}
    </group>
  );
}
