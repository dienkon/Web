import { LAB_SCENARIOS } from '../../../scenarios/catalog';
import { useInteractionStore } from '../../../core/InteractionSystem';
import { useLabEquipment } from '../../../store/useLabEquipment';
import { WASTE_SAMPLES } from '../../../data/wasteSamples';
import { SAFETY_ROUNDS } from '../../../data/safetyRounds';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { findNavigationPath, FloorPoint } from '../../../core/simulation/NavigationPath';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { SceneHtml as Html } from '../SceneHtml';
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
    position: [-0.95, 1.5, 6.82],
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
    position: [4.2, 0.93, 2.62],
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
  playerFlags: { trashCount?: number; extinguisherReady?: boolean; wasteDisposed?: string[] }
): ObjectiveData | null {
  if (currentPhase === 5) {
    const scenario = LAB_SCENARIOS.find(s => !tasks.find(t => t.id === s.taskId)?.completed);
    return scenario ? { id: scenario.taskId, title: scenario.title, position: scenario.position, color: '#3f8c6e' }
      : { ...OBJECTIVE_LOCATIONS.task_talk, title: 'Báo cáo với Thầy để nhận chứng chỉ' };
  }
  if (currentPhase === 4) {
    const round = SAFETY_ROUNDS.find(r => !tasks.find(t => t.id === r.id)?.completed);
    return round ? { id: round.id, title: round.title, position: round.position, color: round.color }
      : { ...OBJECTIVE_LOCATIONS.task_talk, title: 'Báo cáo với Thầy để nhận Chứng chỉ!' };
  }
  const destination = useLabEquipment.getState().destination;
  if(destination)return {...destination,color:'#22d3ee'};
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
    if (!isDone('task_fire_extinguisher')) return playerFlags.extinguisherReady ? { ...OBJECTIVE_LOCATIONS.task_fire_extinguisher, title: 'Dập đám cháy: ngắm gốc và quét vòi phun', position: [4.2, 0.95, -2.2] } : OBJECTIVE_LOCATIONS.task_fire_extinguisher;
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
    if (!isDone('task_trash_disposal')) {
      const inventory = useStore.getState().player.inventory;
      if (!inventory.isHoldingTrash) {
        const remaining = WASTE_SAMPLES.filter(sample=>!playerFlags.wasteDisposed?.includes(sample.id));
        remaining.sort((a,b)=>Math.hypot(a.position[0]-playerCoords.position[0],a.position[2]-playerCoords.position[2])-Math.hypot(b.position[0]-playerCoords.position[0],b.position[2]-playerCoords.position[2]));
        if (remaining[0]) return {id:'task_trash_disposal',title:`Thu gom: ${remaining[0].title}`,position:[...remaining[0].position],color:'#facc15'};
      }
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
  const focused = useInteractionStore(s => s.nearestId);
  const destination = useLabEquipment(s=>s.destination);
  const phase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const flags = useStore(s => s.player.flags);
  const blocked = useStore(isSceneInputBlocked);
  const arrow = useRef<THREE.Group>(null);
  const [route, setRoute] = React.useState<FloorPoint[]>([]);
  const objective = useMemo(() => getActiveObjective(phase, tasks, flags), [destination, phase, tasks, flags]);
  React.useEffect(() => {
    if (!objective || blocked) { setRoute([]); return; }
    let lastX = Infinity, lastZ = Infinity;
    const update = () => {
      const [x, , z] = playerCoords.position;
      if (Math.hypot(x - lastX, z - lastZ) < 0.3) return;
      lastX = x; lastZ = z;
      setRoute(findNavigationPath([x, z], [objective.position[0], objective.position[2]]));
    };
    update(); const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [objective, blocked]);
  useFrame(({ clock }) => {
    if (arrow.current && objective) arrow.current.position.y = objective.position[1] + 0.75 + Math.sin(clock.elapsedTime * 3) * 0.06;
  });
  if (!objective || blocked || focused) return null;
  const [x, y, z] = objective.position;
  return <group name="active-objective">
    {route.length > 1 && <group name="navigation-route" userData={{ points: route }} renderOrder={20}>
      <Line points={route.map(([px,pz])=>[px,.065,pz])} color="#083344" lineWidth={14} depthWrite={false} toneMapped={false} raycast={()=>null} />
      <Line points={route.map(([px,pz])=>[px,.075,pz])} color="#22d3ee" lineWidth={8} depthWrite={false} toneMapped={false} raycast={()=>null} />
      <Line points={route.map(([px,pz])=>[px,.08,pz])} color="#ecfeff" lineWidth={2} dashed dashSize={.5} gapSize={.25} depthWrite={false} toneMapped={false} raycast={()=>null} />
      {route.slice(1).map(([px,pz],i)=><mesh key={i} position={[px,.085,pz]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.11,.17,20]}/><meshBasicMaterial color="#fef08a" toneMapped={false} depthWrite={false}/></mesh>)}
    </group>}
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.28, 0.34, 24]} /><meshBasicMaterial color={objective.color} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <group ref={arrow} position={[0, y + 0.75, 0]}>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.12, 0.28, 12]} /><meshBasicMaterial color={objective.color} /></mesh>
      </group>
      <Html center position={[0, y + 1.05, 0]} className="pointer-events-none">
        <div data-objective-label className="max-w-[220px] rounded-xl border border-cyan-200 bg-white/95 px-3 py-1.5 text-center text-[11px] font-bold text-slate-700 shadow-sm">{objective.title}</div>
      </Html>
    </group>
  </group>;
};
