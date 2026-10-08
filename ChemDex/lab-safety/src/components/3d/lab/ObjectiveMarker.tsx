import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { PhaseEngine } from '../../../core/PhaseEngine';

export interface ObjectiveData {
  id: string;
  title: string;
  position: [number, number, number];
  color: string;
  icon?: string;
}

export const OBJECTIVE_LOCATIONS: Record<string, ObjectiveData> = {
  // Giai đoạn 1: Chuẩn bị & PPE
  task_talk: {
    id: 'task_talk',
    title: 'Gặp Thầy giáo hướng dẫn',
    position: [0.0, 0.05, -4.5],
    color: '#06b6d4', // Cyan
  },
  task_rules: {
    id: 'task_rules',
    title: 'Đọc Bảng nội quy an toàn',
    position: [-9.7, 1.8, 5.0],
    color: '#3b82f6', // Blue
  },
  task_shoes: {
    id: 'task_shoes',
    title: 'Kiểm tra giày kín mũi tại thảm',
    position: [-6.0, 0.05, 6.8],
    color: '#10b981', // Emerald
  },
  task_hair: {
    id: 'task_hair',
    title: 'Buộc tóc gọn gàng trước gương',
    position: [-3.0, 1.5, 7.0],
    color: '#ec4899', // Pink
  },
  task_goggles: {
    id: 'task_goggles',
    title: 'Lấy kính bảo hộ chống hóa chất',
    position: [-3.0, 1.25, 7.0],
    color: '#06b6d4', // Cyan
  },
  task_coat: {
    id: 'task_coat',
    title: 'Mặc áo blouse trắng',
    position: [-4.0, 1.35, 7.0],
    color: '#6366f1', // Indigo
  },
  task_gloves: {
    id: 'task_gloves',
    title: 'Đeo găng tay bảo hộ Nitrile',
    position: [-2.05, 1.25, 7.0],
    color: '#8b5cf6', // Purple
  },
  task_mask: {
    id: 'task_mask',
    title: 'Đeo khẩu trang phòng độc',
    position: [-2.5, 0.65, 7.0],
    color: '#14b8a6', // Teal
  },

  // Giai đoạn 2: Kỹ năng an toàn & Sự cố
  task_fire_extinguisher: {
    id: 'task_fire_extinguisher',
    title: 'Lấy bình cứu hỏa & Học P.A.S.S',
    position: [-9.7, 1.1, -1.5],
    color: '#ef4444', // Red
  },
  task_chemical_symbols: {
    id: 'task_chemical_symbols',
    title: 'Nhận diện biểu tượng cảnh báo GHS',
    position: [5.5, 2.0, -7.2],
    color: '#f59e0b', // Amber
  },
  task_inspect_acid: {
    id: 'task_inspect_acid',
    title: 'Học quy tắc pha loãng Axit (Bàn 4)',
    position: [4.2, 0.95, 2.2],
    color: '#f97316', // Orange
  },
  task_bandage: {
    id: 'task_bandage',
    title: 'Hộp sơ cứu - Học quấn băng gạc',
    position: [-9.7, 1.4, 1.0],
    color: '#10b981', // Emerald
  },

  // Giai đoạn 3: Dọn tràn hóa chất & Thu gom rác
  task_spill_kit: {
    id: 'task_spill_kit',
    title: 'Lấy bộ xử lý tràn (Spill Kit)',
    position: [-9.2, 0.3, 3.0],
    color: '#eab308', // Yellow
  },
  task_spill_neutralize: {
    id: 'task_spill_neutralize',
    title: 'Rải bột trung hòa vũng axit',
    position: [2.5, 0.05, 1.0],
    color: '#0284c7', // Sky Blue
  },
  task_spill_wipe: {
    id: 'task_spill_wipe',
    title: 'Lau dọn sạch vũng hóa chất',
    position: [2.5, 0.05, 1.0],
    color: '#06b6d4', // Cyan
  },
  task_trash_disposal: {
    id: 'task_trash_disposal',
    title: 'Phân loại rác thải nguy hại',
    position: [8.8, 0.5, 5.0],
    color: '#10b981', // Emerald
  },
};

/**
 * Returns the active objective data based on current phase and tasks completion.
 */
export function getActiveObjective(
  currentPhase: number,
  tasks: Array<{ id: string; completed: boolean }>,
  playerFlags: { trashCount?: number }
): ObjectiveData | null {
  const isDone = (id: string) => !!tasks.find((t) => t.id === id)?.completed;

  if (currentPhase === 1) {
    if (!isDone('task_talk')) return OBJECTIVE_LOCATIONS.task_talk;
    if (!isDone('task_rules')) return OBJECTIVE_LOCATIONS.task_rules;
    if (!isDone('task_shoes')) return OBJECTIVE_LOCATIONS.task_shoes;
    if (!isDone('task_hair')) return OBJECTIVE_LOCATIONS.task_hair;
    if (!isDone('task_goggles')) return OBJECTIVE_LOCATIONS.task_goggles;
    if (!isDone('task_coat')) return OBJECTIVE_LOCATIONS.task_coat;
    if (!isDone('task_gloves')) return OBJECTIVE_LOCATIONS.task_gloves;
    if (!isDone('task_mask')) return OBJECTIVE_LOCATIONS.task_mask;
    // All Phase 1 tasks finished -> return to Teacher
    return {
      ...OBJECTIVE_LOCATIONS.task_talk,
      title: 'Báo cáo với Thầy để sang Giai đoạn 2!',
    };
  }

  if (currentPhase === 2) {
    if (!isDone('task_fire_extinguisher')) return OBJECTIVE_LOCATIONS.task_fire_extinguisher;
    if (!isDone('task_chemical_symbols')) return OBJECTIVE_LOCATIONS.task_chemical_symbols;
    if (!isDone('task_inspect_acid')) return OBJECTIVE_LOCATIONS.task_inspect_acid;
    if (!isDone('task_bandage')) return OBJECTIVE_LOCATIONS.task_bandage;
    // All Phase 2 tasks finished -> return to Teacher
    return {
      ...OBJECTIVE_LOCATIONS.task_talk,
      title: 'Báo cáo với Thầy để sang Giai đoạn 3!',
    };
  }

  if (currentPhase === 3) {
    if (!isDone('task_spill_kit')) return OBJECTIVE_LOCATIONS.task_spill_kit;
    if (!isDone('task_spill_neutralize')) return OBJECTIVE_LOCATIONS.task_spill_neutralize;
    if (!isDone('task_spill_wipe')) return OBJECTIVE_LOCATIONS.task_spill_wipe;
    if (!isDone('task_trash_disposal') && (playerFlags.trashCount || 0) < 3) {
      return OBJECTIVE_LOCATIONS.task_trash_disposal;
    }
    // All Phase 3 tasks finished -> return to Teacher for Certificate!
    return {
      ...OBJECTIVE_LOCATIONS.task_talk,
      title: 'Báo cáo với Thầy để nhận Chứng chỉ!',
    };
  }

  return null;
}

export const ObjectiveMarker: React.FC = () => {
  const currentPhase = useStore((s) => s.currentPhase);
  const tasks = useStore((s) => s.tasks);
  const player = useStore((s) => s.player);
  const view = useStore((s) => s.view);

  const markerRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const [distance, setDistance] = React.useState<number>(0);

  const activeObjective = useMemo(() => {
    if (view !== 'game') return null;
    return getActiveObjective(currentPhase, tasks, player.flags);
  }, [currentPhase, tasks, player.flags, view]);

  // Frame animations (Floating bob, slow rotation, and sonar ring pulse)
  useFrame(({ clock }) => {
    if (!activeObjective) return;
    const time = clock.getElapsedTime();

    // Bobbing & Rotating Arrow
    if (arrowRef.current) {
      arrowRef.current.position.y = activeObjective.position[1] + 1.25 + Math.sin(time * 3.5) * 0.12;
      arrowRef.current.rotation.y = time * 1.8;
    }

    // Concentric Sonar Rings Pulsing on the floor
    if (ringRef1.current) {
      const progress1 = (time * 0.8) % 1.0;
      const scale1 = 0.3 + progress1 * 1.2;
      ringRef1.current.scale.set(scale1, scale1, scale1);
      const mat = ringRef1.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, 0.75 * (1 - progress1));
    }

    if (ringRef2.current) {
      const progress2 = ((time * 0.8) + 0.5) % 1.0;
      const scale2 = 0.3 + progress2 * 1.2;
      ringRef2.current.scale.set(scale2, scale2, scale2);
      const mat = ringRef2.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = Math.max(0, 0.75 * (1 - progress2));
    }

    // Distance computation for 3D label
    const dx = activeObjective.position[0] - playerCoords.position[0];
    const dz = activeObjective.position[2] - playerCoords.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    setDistance(parseFloat(dist.toFixed(1)));
  });

  if (!activeObjective) return null;

  const [posX, posY, posZ] = activeObjective.position;
  const isClose = distance < 1.6;

  return (
    <group ref={markerRef} position={[posX, 0, posZ]}>
      {/* 1. Floor Sonar Beacon Rings */}
      <group position={[0, Math.max(0.04, posY + 0.02), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={ringRef1}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial
            color={activeObjective.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={ringRef2}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial
            color={activeObjective.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Floor center glowing target dot */}
        <mesh>
          <circleGeometry args={[0.18, 32]} />
          <meshBasicMaterial
            color={activeObjective.color}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 2. Floating 3D Navigation Arrow & Crystal */}
      <group ref={arrowRef} position={[0, posY + 1.25, 0]}>
        {/* Downward Pointer Cone */}
        <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.45, 16]} />
          <meshStandardMaterial
            color={activeObjective.color}
            emissive={activeObjective.color}
            emissiveIntensity={1.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Hovering Crystal Diamond */}
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color={activeObjective.color}
            emissive={activeObjective.color}
            emissiveIntensity={2.2}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* Soft glowing beacon light */}
        <pointLight
          color={activeObjective.color}
          intensity={1.2}
          distance={4.0}
          decay={2}
        />
      </group>

      {/* 3. Floating 3D HTML Pill Label with Distance */}
      {!isClose && (
        <Html
          position={[0, posY + 1.85, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
          className="pointer-events-none select-none transition-opacity duration-300"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-400/50 shadow-xl text-white text-xs font-bold whitespace-nowrap animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm" />
              <span>{activeObjective.title}</span>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded-md border border-cyan-500/40">
                {distance}m
              </span>
            </div>
            {/* Small downward triangle pointer */}
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-cyan-400/70" />
          </div>
        </Html>
      )}
    </group>
  );
};
