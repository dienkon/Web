import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, Cylinder, Sphere, Text, Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

import { LabDecorations } from './LabDecorations';
import { TeacherModel, SideTable } from './LabEnvironmentPieces';
import { InteractionManager } from './InteractionManager';
import { InteractableItem } from './InteractableItem';
import { useStore, playerCoords } from '../../store/useStore';
import * as THREE from 'three';

const VIETNAMESE_FONT = undefined;

import { PhaseEngine } from '../../core/PhaseEngine';

// 30 Fixed Decorative Educational Chemistry Objects in Laboratory with standard Vietnamese


interface DashedGuideLineProps {
  start?: any;
  end: [number, number, number];
}

const DashedGuideLine: React.FC<DashedGuideLineProps> = ({ end }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const startX = playerCoords.position[0];
    const startZ = playerCoords.position[2];
    const dx = end[0] - startX;
    const dz = end[2] - startZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.8) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const angleY = Math.atan2(dx, dz);
    const speed = 1.2;
    const offset = (state.clock.getElapsedTime() * speed) % 0.6;

    const count = meshesRef.current.length;
    for (let i = 0; i < count; i++) {
      const mesh = meshesRef.current[i];
      if (!mesh) continue;
      const progress = (i * 0.5 + offset) / distance;
      if (progress > 0.95 || progress < 0.05) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.set(
          startX + dx * progress,
          0.05,
          startZ + dz * progress
        );
        mesh.rotation.y = angleY;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshesRef.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.15, 0.28]} />
          <meshBasicMaterial color="#0ea5b7" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

const getActiveTargetPosition = (
  currentPhase: number,
  talkCompleted: boolean,
  rulesCompleted: boolean,
  gogglesCompleted: boolean,
  coatCompleted: boolean,
  glovesCompleted: boolean,
  maskCompleted: boolean,
  hairCompleted: boolean,
  shoesCompleted: boolean,
  player: any,
  chemicalSymbolsCompleted: boolean,
  acidCompleted: boolean,
  bandageCompleted: boolean,
  spillKitCompleted: boolean,
  spillWipeCompleted: boolean
): [number, number, number] | null => {
  if (currentPhase === 1) {
    if (!talkCompleted) return [2, 0.8, -5]; // Teacher
    if (!rulesCompleted) return [-9.6, 2.0, -1.5]; // Rules Board
    if (!gogglesCompleted) return [-3, 1.0, 0]; // Table Goggles
    if (!coatCompleted) return [-2, 1.0, 0]; // Table Coat
    if (!glovesCompleted) return [-1, 1.0, 0]; // Table Gloves
    if (!maskCompleted) return [0, 1.0, 0]; // Table Mask
    if (!hairCompleted) return [1, 1.0, 0]; // Table Hair Tie/Mirror
    if (!shoesCompleted) return [0, 0.01, 2.5]; // Shoe Mat
    return [2, 0.8, -5]; // Teacher to report Phase 1
  }
  if (currentPhase === 2) {
    if (!player.inventory.hasFireExtinguisher && !player.flags.fireExtinguished) {
      return [-9.5, 1.5, 0]; // Fire Extinguisher on Wall
    }
    if (!player.flags.fireExtinguished) {
      return [-4, 0.05, 2.5]; // Fire in corner
    }
    if (!chemicalSymbolsCompleted) {
      return [-3, 2.0, -9.7]; // Warning Board
    }
    if (!acidCompleted) {
      return [3, 1.0, 0.5]; // Acid station on table
    }
    if (!bandageCompleted) {
      return [-9.7, 2.2, 4.0]; // First aid box
    }
    return [2, 0.8, -5]; // Teacher to report Phase 2
  }
  if (currentPhase === 3) {
    if (!spillKitCompleted) {
      return [4, 0.25, 2.0]; // Spill Kit cabinet
    }
    if (!spillWipeCompleted) {
      return [4, 0.015, 0.5]; // Spill vũng nước
    }
    // Trash task logic:
    if (player.flags.trashCount < 3) {
      if (player.inventory.isHoldingTrash) {
        return [10.5, 0.45, 7.5]; // Bins
      }
      if (!player.flags.trash1Picked) return [-3.0, 0.15, 2.5]; // Trash 1
      if (!player.flags.trash2Picked) return [4.5, 0.15, -4.5]; // Trash 2
      if (!player.flags.trash3Picked) return [-2.0, 0.15, -3.5]; // Trash 3
    }
    return [2, 0.8, -5]; // Teacher to report Phase 3 / Finish
  }
  return null;
};

export const LabEnvironment: React.FC = () => {
  const settings = useStore(s => s.settings);
  const currentPhase = useStore((s) => s.currentPhase);
  const player = useStore((s) => s.player);
  const tasks = useStore((s) => s.tasks);
  const setCurrentPhase = useStore((s) => s.setCurrentPhase);
  const completeTask = useStore((s) => s.completeTask);
  const setShowRulesList = useStore((s) => s.setShowRulesList);
  const setShowFireExtinguisherQuiz = useStore((s) => s.setShowFireExtinguisherQuiz);
  const setShowBandageQuiz = useStore((s) => s.setShowBandageQuiz);
  const endGame = useStore((s) => s.endGame);

  const [isSpraying, setIsSpraying] = useState(false);
  const fireScaleRef = useRef(1);
  const fireGroupRef = useRef<any>(null);
  const fireLightRef = useRef<THREE.PointLight>(null);

  const talkCompleted = tasks.find(t => t.id === 'task_talk')?.completed;
  const rulesCompleted = tasks.find(t => t.id === 'task_rules')?.completed;
  const gogglesCompleted = tasks.find(t => t.id === 'task_goggles')?.completed;
  const coatCompleted = tasks.find(t => t.id === 'task_coat')?.completed;
  const glovesCompleted = tasks.find(t => t.id === 'task_gloves')?.completed;
  const maskCompleted = tasks.find(t => t.id === 'task_mask')?.completed;
  const hairCompleted = tasks.find(t => t.id === 'task_hair')?.completed;
  const shoesCompleted = tasks.find(t => t.id === 'task_shoes')?.completed;

  const fireExtCompleted = tasks.find(t => t.id === 'task_fire_extinguisher')?.completed;
  const chemicalSymbolsCompleted = tasks.find(t => t.id === 'task_chemical_symbols')?.completed;
  const acidCompleted = tasks.find(t => t.id === 'task_inspect_acid')?.completed;
  const bandageCompleted = tasks.find(t => t.id === 'task_bandage')?.completed;

  const spillKitCompleted = tasks.find(t => t.id === 'task_spill_kit')?.completed;
  const spillNeutralizeCompleted = tasks.find(t => t.id === 'task_spill_neutralize')?.completed;
  const spillWipeCompleted = tasks.find(t => t.id === 'task_spill_wipe')?.completed;

  // Evaluate teacher dynamic dialog sequence
  const teacherDialog = PhaseEngine.getTeacherDialog(currentPhase, tasks, player, completeTask, setCurrentPhase, endGame);

  // Find active target position for the dashed guide line
  const targetPos = useMemo(() => {
    return getActiveTargetPosition(
      currentPhase,
      !!talkCompleted,
      !!rulesCompleted,
      !!gogglesCompleted,
      !!coatCompleted,
      !!glovesCompleted,
      !!maskCompleted,
      !!hairCompleted,
      !!shoesCompleted,
      player,
      !!chemicalSymbolsCompleted,
      !!acidCompleted,
      !!bandageCompleted,
      !!spillKitCompleted,
      !!spillWipeCompleted
    );
  }, [
    currentPhase,
    talkCompleted,
    rulesCompleted,
    gogglesCompleted,
    coatCompleted,
    glovesCompleted,
    maskCompleted,
    hairCompleted,
    shoesCompleted,
    player,
    chemicalSymbolsCompleted,
    acidCompleted,
    bandageCompleted,
    spillKitCompleted,
    spillWipeCompleted
  ]);

  // Generate dynamic leopard print ("vàng nhạt da beo") texture using Canvas
  const leopardTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Base light yellow leopard color
    ctx.fillStyle = '#fef08a'; // Tailwind yellow-200
    ctx.fillRect(0, 0, 512, 512);

    // 2. Add organic cheetah spots
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = 8 + Math.random() * 10;

      // Draw random center light brown/orange
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#ca8a04'; // Medium yellow-brown
      ctx.fill();

      // Draw broken dark outer ring
      ctx.strokeStyle = '#1e293b'; // Slate dark
      ctx.lineWidth = 3 + Math.random() * 2;

      // Draw two separate broken arcs
      const offsetAngle = Math.random() * Math.PI;
      ctx.beginPath();
      ctx.arc(x, y, radius, offsetAngle, offsetAngle + Math.PI * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, radius, offsetAngle + Math.PI, offsetAngle + Math.PI * 1.7);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1.5);
    return tex;
  }, []);

  // Frame tick animation for fire and extinguisher spray (pure transient refs, 0 React re-renders)
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const flk = 1 + Math.sin(time * 18) * 0.15 + Math.cos(time * 26) * 0.1;
    
    if (fireGroupRef.current) {
      if (isSpraying) {
        if (fireGroupRef.current.scale.x > 0.05) {
          fireGroupRef.current.scale.subScalar(0.015);
        }
      } else {
        fireGroupRef.current.scale.set(flk, flk * 1.1, flk);
      }
    }

    if (fireLightRef.current) {
      fireLightRef.current.intensity = 2.2 * flk;
    }
  });

  // Safe action step handler for fire extinguishing
  const handleFireClick = () => {
    if (player.flags.fireExtinguished) return;

    if (!player.inventory.hasFireExtinguisher) {
      useStore.getState().startDialog([
        "CẢNH BÁO NGUY HIỂM: Đám cháy hóa chất hữu cơ cực kỳ dữ dội đang xảy ra ở góc phòng!",
        "Tuyệt đối KHÔNG ĐƯỢC dùng nước để dập lửa! Nước gặp kim loại kiềm hoặc các dung môi phản ứng mạnh sẽ làm đám cháy nổ to hơn và bắn hóa chất tung tóe.",
        "Nhiệm vụ của em: Hãy đi qua phía bức tường bên trái, click vào Bình cứu hỏa màu đỏ để học quy trình P.A.S.S an toàn và lấy bình khí CO2 dập lửa ngay!"
      ]);
      return;
    }
    
    const firePos = [-4, 0.4, 2.5];
    const dx = firePos[0] - playerCoords.position[0];
    const dz = firePos[2] - playerCoords.position[2];
    const distance = Math.sqrt(dx*dx + dz*dz);

    if (distance < 0.8) {
      useStore.getState().addError('general_error', { penalty: 5 }); // Stand too close
      useStore.getState().startDialog([
        "CẢNH BÁO: BẠN ĐỨNG QUÁ GẦN ĐÁM CHÁY!",
        "Đứng gần ngọn lửa sẽ gây bỏng và ngạt khí. Hãy lùi lại khoảng cách an toàn (ra khỏi vùng cháy) rồi mới xịt!"
      ]);
      return;
    }

    if (distance > 4.5) {
      useStore.getState().startDialog([
        "Bạn đứng quá xa đám cháy. Khí CO2 sẽ bị loãng và không hiệu quả. Hãy tiến lại gần hơn chút nữa!"
      ]);
      return;
    }

    // Player has extinguisher! Let's spray CO2 gas
    setIsSpraying(true);
    useStore.getState().startDialog([
      "Bắt đầu thực hiện quy trình P.A.S.S cứu hộ!",
      "Đã giật chốt! Họng súng phun CO2 đang dội luồng khí lạnh âm 79°C vào tận gốc đám cháy hóa chất..."
    ], () => {
      // Complete extinguisher task after spraying anim
      setTimeout(() => {
        setIsSpraying(false);
        // Set extinguished in state
        useStore.setState((state) => ({
          player: { ...state.player, flags: { ...state.player.flags, fireExtinguished: true } }
        }));
        completeTask('task_fire_extinguisher');
        
        // Show celebratory dialog
        useStore.getState().startDialog([
          "Tuyệt cú mèo! Đám cháy hóa chất độc hại đã bị dập tắt hoàn toàn bằng tuyết khí lạnh CO2 đạt chuẩn an toàn phòng cháy 100/100!",
          "Khí CO2 bay hơi sạch sẽ mà không để lại bất kỳ tàn dư gây ô nhiễm nào cho thiết bị điện tử trong phòng.",
          "Em hãy đi hoàn thành nốt các nhiệm vụ còn lại của Giai đoạn 2 rồi lại báo cáo với thầy nhé!"
        ]);
      }, 2500);
    });
  };

  // Spray vector calculations for Three.js rendering
  const sprayVector = useMemo(() => {
    const firePos = [-4, 0.4, 2.5];
    const dx = firePos[0] - playerCoords.position[0];
    const dy = firePos[1] - playerCoords.position[1];
    const dz = firePos[2] - playerCoords.position[2];
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const angleY = Math.atan2(dx, dz);
    return { distance, angleY, center: [(playerCoords.position[0] + firePos[0])/2, 0.6, (playerCoords.position[2] + firePos[2])/2] as [number, number, number] };
  }, [isSpraying]);

  return (
    <group>
      <InteractionManager />
      {/* Light setups & shadow adjustments */}
      {/* Glossy white epoxy floor */}
      <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.25} metalness={0.05} />
      </mesh>

      {/* Grid helper with subtle blue-gray tiles */}
      <gridHelper args={[22, 22, '#cbd5e1', '#e2e8f0']} position={[0, 0.005, 0]} />

      {/* Walls */}
      <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} position={[0, 2, -10]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} position={[10, 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[20, 4, 0.5]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Whiteboard with Safety title in Beautiful standard signed Vietnamese */}
      <group position={[0, 2.1, -9.7]}>
        <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
          <boxGeometry args={[6.5, 2.8, 0.1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} metalness={0.05} />
        </mesh>
        <Text
          font={VIETNAMESE_FONT}
          position={[0, 1.0, 0.06]}
          fontSize={0.24}
          color="#0f172a"
          anchorX="center"
          anchorY="middle"
        >
          AN TOÀN PHÒNG THÍ NGHIỆM HÓA HỌC
        </Text>
        <Text
          font={VIETNAMESE_FONT}
          position={[0, 0.65, 0.06]}
          fontSize={0.14}
          color="#0284c7"
          anchorX="center"
          anchorY="middle"
        >
          {`MÀN CHƠI HIỆN TẠI: GIAI ĐOẠN ${currentPhase}`}
        </Text>
        <Text
          font={VIETNAMESE_FONT}
          position={[-2.8, 0.35, 0.06]}
          fontSize={0.09}
          color="#334155"
          anchorX="left"
          anchorY="top"
          lineHeight={1.4}
          maxWidth={5.8}
        >
          {currentPhase === 1 
            ? "• Bước 1: Nói chuyện với Thầy Giáo để nhận hướng dẫn.\n• Bước 2: Đọc Bảng nội quy an toàn phòng thực hành.\n• Bước 3: Đeo Kính bảo hộ ở bàn học để bảo vệ mắt.\n• Bước 4: Mặc Áo blouse trắng bảo vệ cơ thể khỏi axit.\n• Bước 5: Đeo Găng tay bảo hộ chống hóa chất ăn mòn.\n• Bước 6: Đeo Khẩu trang phòng độc bảo vệ hệ hô hấp.\n• Bước 7: Buộc gọn tóc dài trước gương bằng dây thun.\n• Bước 8: Kiểm tra giày kín mũi tại Thảm kiểm soát ở lối vào."
            : currentPhase === 2
            ? "• Bước 1: Nhấp vào Bình cứu hỏa CO2 trên tường học quy tắc P.A.S.S\n• Bước 2: Đi đến đám cháy màu đỏ ở góc phòng dập lửa khẩn cấp.\n• Bước 3: Đến Bảng Cảnh Báo Hóa Chất học biển báo an toàn.\n• Bước 4: Kiểm tra cốc Axit Sunfuric (Quy tắc rót Axit vào Nước).\n• Bước 5: Báo cáo kết quả với Thầy Giáo để chuyển sang Giai đoạn 3."
            : "• Bước 1: Đến thùng Spill Kit màu vàng lấy bột trung hòa Sodium Bicarbonate.\n• Bước 2: Nhấp trực tiếp vào vũng hóa chất màu xanh để rải bột trung hòa sủi bọt.\n• Bước 3: Tiếp tục click vào vũng sủi bọt để dùng giấy lau dọn sạch hoàn toàn vũng rò rỉ."
          }
        </Text>
      </group>

      {/* 30 Fixed Decorative Educational Items with standard Vietnamese */}
      <LabDecorations />

      {/* Decorative Wooden Shelves on Walls */}
      {/* Back Wall Left Shelf */}
      <group position={[-5, 1.55, -9.5]}>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[3, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Back Wall Right Shelf */}
      <group position={[5, 1.55, -9.5]}>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[3, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Left Wall Shelf */}
      <group position={[-9.5, 1.55, -3.2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Right Wall Shelf 1 */}
      <group position={[9.5, 1.55, -2.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>
      {/* Right Wall Shelf 2 */}
      <group position={[9.5, 1.55, 2.4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[2.5, 0.04, 0.4]} />
          <meshStandardMaterial color="#5c2d0c" roughness={0.7} />
        </mesh>
      </group>

      {/* --- New Side Tables for Relocated Non-Task Decorative Items --- */}
      <SideTable position={[-7.0, 0.9, -6.0]} />
      <SideTable position={[7.0, 0.9, -6.0]} />
      <SideTable position={[-7.0, 0.9, 5.0]} />
      <SideTable position={[7.0, 0.9, 5.0]} />

      {/* Main Lab Table - Solid Light Yellow */}
      <group position={[0, 0.9, 0]}>
        {/* Table Top with Solid Light Yellow */}
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, 0, 0]}>
          <boxGeometry args={[8, 0.1, 3]} />
          <meshStandardMaterial color="#fef9c3" roughness={0.3} metalness={0.05} />
        </mesh>
        
        {/* Table Legs with rich details */}
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[-3.8, -0.45, -1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[3.8, -0.45, -1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[-3.8, -0.45, 1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[3.8, -0.45, 1.3]}>
          <boxGeometry args={[0.15, 0.9, 0.15]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* ULTRA-DETAILED TEST TUBE RACK (Giá ống nghiệm chi tiết với vạch chia độ và bọt khí) */}
        <group position={[-0.3, 0.05, -0.6]}>
          {/* Wooden Rack Base */}
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.16]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} /> {/* Brown wood */}
          </mesh>
          {/* Wooden Rack Top Plate (with holes) */}
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, 0.16, 0]}>
            <boxGeometry args={[0.5, 0.02, 0.16]} />
            <meshStandardMaterial color="#854d0e" roughness={0.7} />
          </mesh>
          {/* Wooden Rack Side Posts */}
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[-0.24, 0.08, 0]}>
            <boxGeometry args={[0.02, 0.16, 0.14]} />
            <meshStandardMaterial color="#a16207" roughness={0.7} />
          </mesh>
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0.24, 0.08, 0]}>
            <boxGeometry args={[0.02, 0.16, 0.14]} />
            <meshStandardMaterial color="#a16207" roughness={0.7} />
          </mesh>

          {/* Test Tube 1: CuSO4 (Blue with bubbles and graduation ticks) */}
          <group position={[-0.15, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Blue fluid */}
            <mesh position={[0, -0.03, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.018, 0.018, 0.12, 12]} />
              <meshStandardMaterial color="#2563eb" opacity={0.75} transparent roughness={0.1} />
            </mesh>
            {/* Fluid bubbles */}
            <mesh position={[0.005, 0.01, 0.005]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <sphereGeometry args={[0.004, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" roughness={0.1} />
            </mesh>
            <mesh position={[-0.005, -0.02, -0.005]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <sphereGeometry args={[0.003, 8, 8]} />
              <meshStandardMaterial color="#60a5fa" roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 2: KMnO4 (Deep Purple with graduation ticks) */}
          <group position={[-0.05, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Purple fluid */}
            <mesh position={[0, -0.04, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.018, 0.018, 0.1, 12]} />
              <meshStandardMaterial color="#a21caf" opacity={0.8} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 3: Methyl Orange (Orange/Yellow fluid) */}
          <group position={[0.05, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Orange fluid */}
            <mesh position={[0, -0.02, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.018, 0.018, 0.14, 12]} />
              <meshStandardMaterial color="#f97316" opacity={0.75} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0.02, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.02, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* Test Tube 4: Phenolphthalein (Clear water-like fluid) */}
          <group position={[0.15, 0.12, 0]}>
            {/* Glass Tube body */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.3} transparent roughness={0.1} />
            </mesh>
            {/* Clear fluid */}
            <mesh position={[0, -0.04, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.018, 0.018, 0.1, 12]} />
              <meshStandardMaterial color="#ffffff" opacity={0.4} transparent roughness={0.1} />
            </mesh>
            {/* White graduation tick marks */}
            <mesh position={[0, 0, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.03, 0.019]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.015, 0.0015, 0.001]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>

      </group> {/* Close main table group here */}

        {/* --- Interactable Items on Table (Now in absolute world space) --- */}
        
        {/* Goggles */}
        <InteractableItem 
          id="goggles" 
          position={[-3, 0.95, 0]} 
          label="Kính bảo hộ (Click đeo kính)" 
          type="equip" 
          equipKey="hasGoggles"
          taskId="task_goggles"
          visible={currentPhase === 1 && rulesCompleted && !gogglesCompleted}
          isGlowing={currentPhase === 1 && rulesCompleted && !gogglesCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Lenses */}
            <mesh position={[-0.1, 0, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.15, 0.05, 0.02]} />
              <meshStandardMaterial color="#38bdf8" opacity={0.6} transparent roughness={0.1} />
            </mesh>
            <mesh position={[0.1, 0, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.15, 0.05, 0.02]} />
              <meshStandardMaterial color="#38bdf8" opacity={0.6} transparent roughness={0.1} />
            </mesh>
            {/* Frame */}
            <mesh position={[0, 0.03, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.35, 0.02, 0.03]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Detailed black strap */}
            <mesh position={[0, 0.01, -0.06]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.28, 0.01, 0.1]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Lab Coat */}
        <InteractableItem 
          id="coat" 
          position={[-2, 0.95, 0]} 
          label="Áo blouse trắng (Mặc áo)" 
          type="equip" 
          equipKey="hasLabCoat"
          taskId="task_coat"
          visible={currentPhase === 1 && gogglesCompleted && !coatCompleted}
          isGlowing={currentPhase === 1 && gogglesCompleted && !coatCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Folded Coat Body */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.4, 0.06, 0.3]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            {/* Collar / Fold detail */}
            <mesh position={[0, 0.035, 0.05]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.38, 0.02, 0.2]} />
              <meshStandardMaterial color="#f1f5f9" roughness={1} />
            </mesh>
            {/* Pocket */}
            <mesh position={[0.1, 0.045, 0.1]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.08, 0.01, 0.08]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          </group>
        </InteractableItem>

        {/* Gloves */}
        <InteractableItem 
          id="gloves" 
          position={[-1, 0.95, 0]} 
          label="Găng tay bảo hộ (Đeo găng)" 
          type="equip" 
          equipKey="hasGloves"
          taskId="task_gloves"
          visible={currentPhase === 1 && coatCompleted && !glovesCompleted}
          isGlowing={currentPhase === 1 && coatCompleted && !glovesCompleted}
        >
          <group position={[0, 0.05, 0]}>
            {/* Glove 1 */}
            <mesh position={[-0.05, 0, 0]} rotation={[0, 0.2, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.1, 0.02, 0.2]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.4} />
            </mesh>
            {/* Glove 2 */}
            <mesh position={[0.05, 0.02, 0.02]} rotation={[0, -0.1, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.1, 0.02, 0.2]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.4} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Face Mask respirator on table */}
        <InteractableItem
          id="mask"
          position={[0, 0.95, 0]}
          label="Khẩu trang phòng độc (Đeo khẩu trang)"
          type="equip"
          equipKey="hasMask"
          taskId="task_mask"
          visible={currentPhase === 1 && glovesCompleted && !maskCompleted}
          isGlowing={currentPhase === 1 && glovesCompleted && !maskCompleted}
        >
          <group position={[0, 0.04, 0]}>
            {/* Mask plate */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.2, 0.04, 0.12]} />
              <meshStandardMaterial color="#0284c7" roughness={0.7} />
            </mesh>
            {/* Active canisters */}
            <mesh position={[-0.07, 0, 0.04]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0.07, 0, 0.04]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 12]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        </InteractableItem>

        {/* Hair Tie Station */}
        <InteractableItem 
          id="hair" 
          position={[1, 0.95, 0]} 
          label="Gương soi (Buộc tóc dài gọn gàng)" 
          type="action"
          equipKey="hairTied"
          taskId="task_hair"
          successMessage="Tóc đã được buộc gọn gàng bằng dây thun đen chống bắt lửa."
          visible={currentPhase === 1 && maskCompleted && !hairCompleted}
          isGlowing={currentPhase === 1 && maskCompleted && !hairCompleted}
        >
          <group>
            {/* Mirror stands */}
            <mesh position={[0, 0.15, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.05, 0.05, 0.3, 16]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} />
            </mesh>
            {/* Mirror glass frame */}
            <mesh position={[0, 0.4, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.4, 0.5, 0.04]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Reflective mirror surface */}
            <mesh position={[0, 0.4, 0.021]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <planeGeometry args={[0.34, 0.44]} />
              <meshStandardMaterial color="#93c5fd" opacity={0.65} transparent roughness={0.1} metalness={0.8} />
            </mesh>
          </group>
        </InteractableItem>

        {/* Chemical Warning Board */}
        <InteractableItem 
          id="chemical_symbols" 
          position={[-3, 2.0, -9.7]} 
          label="Bảng Cảnh Báo Hóa Chất" 
          type="learn"
          visible={currentPhase >= 2}
          disabled={currentPhase < 2}
          isGlowing={currentPhase === 2 && fireExtCompleted && !chemicalSymbolsCompleted}
          dialogSequence={[
            "Bảng cảnh báo hóa chất là hệ thống thông tin đặc biệt quan trọng.",
            "Tại đây có rất nhiều biểu tượng hiển thị các loại nguy hại khác nhau.",
            "Hãy hoàn thành bài kiểm tra nhỏ sau đây để chứng minh em đã nắm rõ các biểu tượng này."
          ]}
          dialogCallback={() => {
            useStore.getState().setShowChemicalSymbolsQuiz(true);
          }}
        >
          <group>
            {/* Board Background */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, 0, 0.05]}>
              <boxGeometry args={[1.5, 1.2, 0.05]} />
              <meshStandardMaterial color="#ffffff" roughness={0.7} />
            </mesh>
            {/* Board Frame */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} position={[0, 0, 0.04]}>
              <boxGeometry args={[1.6, 1.3, 0.06]} />
              <meshStandardMaterial color="#475569" roughness={0.8} />
            </mesh>
            
            {/* Title */}
            <Text font={VIETNAMESE_FONT} position={[0, 0.45, 0.08]} fontSize={0.12} color="#b91c1c" anchorX="center" anchorY="middle" maxWidth={1.4}>
              BIỂU TƯỢNG CẢNH BÁO
            </Text>
            
            <Text font={VIETNAMESE_FONT} position={[0, 0.25, 0.08]} fontSize={0.06} color="#0f172a" anchorX="center" anchorY="middle" maxWidth={1.4}>
              BẮT BUỘC NHẬN DIỆN TRƯỚC KHI THỰC HÀNH
            </Text>

            {/* Icons Grid visualization */}
            <group position={[0, -0.1, 0.08]}>
              <mesh position={[-0.4, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fcd34d" /></mesh>
              <mesh position={[0, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fca5a5" /></mesh>
              <mesh position={[0.4, 0, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#86efac" /></mesh>
              <mesh position={[-0.2, -0.3, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#fdba74" /></mesh>
              <mesh position={[0.2, -0.3, 0]}><planeGeometry args={[0.2, 0.2]} /><meshBasicMaterial color="#93c5fd" /></mesh>
            </group>
          </group>
        </InteractableItem>

        {/* Acid Mixing Station */}
        <InteractableItem 
          id="acid_mix" 
          position={[3, 1.05, 0.5]} 
          label="Pha loãng H2SO4 (Cách rót Axit)" 
          type="learn"
          taskId="task_inspect_acid"
          ruleId={17}
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves']}
          visible={currentPhase >= 2}
          disabled={currentPhase < 2}
          isGlowing={currentPhase === 2 && chemicalSymbolsCompleted && !acidCompleted}
        >
          <group>
            {/* Beaker with water */}
            <group position={[-0.25, 0, 0]}>
              <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.2} />
              </mesh>
              {/* Water fluid */}
              <mesh position={[0, -0.05, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.14, 0.14, 0.18, 16]} />
                <meshStandardMaterial color="#3b82f6" opacity={0.7} transparent roughness={0.1} />
              </mesh>
              {/* Graduation markings */}
              <group position={[0, 0, 0.151]}>
                <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.06, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
              </group>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0]} fontSize={0.07} color="white">NƯỚC (H2O)</Text>
            </group>

            {/* Acid Pipette container */}
            <group position={[0.25, 0, 0]}>
              <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.2} />
              </mesh>
              {/* Acid fluid */}
              <mesh position={[0, -0.05, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.09, 0.09, 0.18, 16]} />
                <meshStandardMaterial color="#ef4444" opacity={0.8} transparent roughness={0.1} />
              </mesh>
              {/* Graduation markings */}
              <group position={[0, 0, 0.101]}>
                <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, 0, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
                <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.04, 0.004, 0.001]} /><meshBasicMaterial color="#ffffff" /></mesh>
              </group>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0]} fontSize={0.07} color="white">AXIT (H2SO4)</Text>
            </group>
          </group>
        </InteractableItem>

      {/* Rules Board on left wall with beautiful standard Vietnamese Text */}
      <InteractableItem
        id="rules_board"
        position={[-9.6, 2.0, -1.5]}
        label="Bảng Quy Tắc An Toàn (100 Nội Quy)"
        type="action"
        taskId="task_rules"
        visible={currentPhase === 1 && talkCompleted && !rulesCompleted}
        isGlowing={currentPhase === 1 && talkCompleted && !rulesCompleted}
        dialogSequence={[
          "Chào mừng em đến với bảng nội quy phòng thí nghiệm hóa học!",
          "Nội quy gồm 100 điều bảo vệ sức khỏe và tính mạng tối cao của nhà nghiên cứu.",
          "Thầy đã mở Sổ tay 100 Quy tắc chi tiết lên màn hình cho em, hãy cùng cuộn xem thật kỹ nhé!"
        ]}
        dialogCallback={() => {
          setShowRulesList(true);
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <boxGeometry args={[2.5, 1.8, 0.08]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.042]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <planeGeometry args={[2.3, 1.6]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <Text font={VIETNAMESE_FONT} position={[0, 0.65, 0.05]} fontSize={0.08} color="#0f172a">
            100 QUY TẮC AN TOÀN PHÒNG THÍ NGHIỆM
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, 0.3, 0.05]} fontSize={0.05} color="#dc2626" anchorX="left">
            1. Bắt buộc trang bị Kính bảo hộ mắt
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, 0.12, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            2. Bắt buộc mặc áo Blouse trắng dày dặn
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, -0.06, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            3. Bắt buộc mang Găng tay cao su phòng độc
          </Text>
          <Text font={VIETNAMESE_FONT} position={[-0.9, -0.24, 0.05]} fontSize={0.05} color="#1e293b" anchorX="left">
            4. Phải đeo Khẩu trang khi tiếp xúc hơi khí độc bay hơi
          </Text>
          <Text font={VIETNAMESE_FONT} position={[0, -0.55, 0.05]} fontSize={0.05} color="#2563eb" anchorX="center">
            [Click chuột để mở Sổ Tay xem tất cả 100 quy tắc]
          </Text>
        </group>
      </InteractableItem>

      {/* Thảm kiểm tra giày (Shoe check mat on floor) */}
      <InteractableItem
        id="shoes_mat"
        position={[0, 0.01, 2.5]}
        label="Thảm kiểm tra giày"
        type="action"
        equipKey="hasClosedShoes"
        taskId="task_shoes"
        visible={currentPhase === 1 && hairCompleted && !shoesCompleted}
        isGlowing={currentPhase === 1 && hairCompleted && !shoesCompleted}
        successMessage="Em đã kiểm tra giày thành công: Đã mang giày bảo hộ kín mũi bọc cao su dày đạt tiêu chuẩn an toàn phòng thí nghiệm!"
      >
        <mesh receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
          <boxGeometry args={[1.2, 0.02, 1.2]} />
          <meshStandardMaterial color="#059669" roughness={1.0} /> {/* Green Safety Mat */}
        </mesh>
        {/* Render outline of shoes on the mat using small 3D box shapes */}
        <group position={[0, 0.015, 0]}>
          <mesh position={[-0.15, 0, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <boxGeometry args={[0.14, 0.03, 0.35]} />
            <meshStandardMaterial color="#047857" />
          </mesh>
          <mesh position={[0.15, 0, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <boxGeometry args={[0.14, 0.03, 0.35]} />
            <meshStandardMaterial color="#047857" />
          </mesh>
        </group>
      </InteractableItem>

      {/* 3D Chemical Fire in Giai đoạn 2 (Flickering & point lights) */}
      {currentPhase === 2 && !player.flags.fireExtinguished && (
        <InteractableItem
          id="chemical_fire_item"
          position={[-4, 0.05, 2.5]}
          label="ĐÁM CHÁY HÓA CHẤT (CLICK DẬP LỬA)"
          type="action"
          isGlowing={currentPhase === 2}
          successMessage="Đám cháy đã bị khống chế!"
        >
          {/* Flame clickable interaction group */}
          <group onClick={(e) => { e.stopPropagation(); handleFireClick(); }}>
            {/* Heat Ring Base */}
            <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <ringGeometry args={[0, 0.65, 32]} />
              <meshBasicMaterial color="#ef4444" opacity={0.3} transparent />
            </mesh>
            
            {/* Multi-layered flickering flame */}
            <group ref={fireGroupRef}>
              <mesh position={[0, 0.4, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ea580c" />
              </mesh>
              <mesh position={[0, 0.7, 0]} scale={[0.7, 1.4, 0.7]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
              <mesh position={[0.12, 0.9, -0.08]} scale={[0.4, 1.2, 0.4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
              <mesh position={[-0.12, 0.8, 0.08]} scale={[0.4, 1.1, 0.4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
                <sphereGeometry args={[0.16, 16, 16]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
              <mesh position={[0.04, 1.12, 0.04]} scale={[0.2, 0.8, 0.2]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>

            {/* Glowing point light */}
            <pointLight ref={fireLightRef} distance={5} intensity={2.2} color="#f97316" position={[0, 0.6, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} />
            
            <Html position={[0, 1.4, 0]} center>
              <div className="bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded shadow-lg border border-red-400 whitespace-nowrap animate-pulse select-none">
                🔥 ĐÁM CHÁY HÓA CHẤT!
              </div>
            </Html>
          </group>
        </InteractableItem>
      )}

      {/* CO2 Jet Spray cloud stream stretching from player to fire */}
      {isSpraying && sprayVector && (
        <group position={sprayVector.center} rotation={[0, sprayVector.angleY + Math.PI/2, 0]}>
          <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            {/* Cone pointing towards fire */}
            <coneGeometry args={[0.65, sprayVector.distance, 16]} />
            <meshBasicMaterial color="#f8fafc" opacity={0.7} transparent />
          </mesh>
          {/* Secondary expanding steam ring */}
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#ffffff" opacity={0.4} transparent />
          </mesh>
        </group>
      )}

      {/* Spill Kit Station (Floor) */}
      <InteractableItem 
        id="spill_kit" 
        position={[4, 0.25, 2.0]} 
        label="Hộp đựng Spill Kit dọn hóa chất tràn" 
        type="action"
        taskId="task_spill_kit"
        successMessage="Em đã lấy thành công Bột trung hòa axit và Giấy lau thấm hút chuyên dụng từ Hộp Spill Kit!"
        requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
        visible={currentPhase === 3}
        disabled={currentPhase < 3}
        isGlowing={currentPhase === 3 && !spillKitCompleted}
      >
        <Box args={[0.5, 0.5, 0.5]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <meshStandardMaterial color="#eab308" roughness={0.3} />
        </Box>
        <Text font={VIETNAMESE_FONT} position={[0, 0.3, 0.26]} fontSize={0.08} color="black">SPILL KIT</Text>
      </InteractableItem>

      {/* Spill Toxic Chemical Puddle on floor - Interactive Cleanup Steps */}
      {currentPhase === 3 && !spillWipeCompleted && (
        <InteractableItem
          id="chemical_spill_item"
          position={[4, 0.015, 0.5]}
          label={!spillNeutralizeCompleted ? "Vũng hóa chất tràn (Cần trung hòa)" : "Hóa chất đã trung hòa (Cần lau dọn)"}
          type="action"
          taskId={!spillNeutralizeCompleted ? "task_spill_neutralize" : "task_spill_wipe"}
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          isGlowing={currentPhase === 3 && spillKitCompleted}
          successMessage={
            !spillNeutralizeCompleted 
              ? "Tuyệt vời! Em đã rải đều bột trung hòa sủi bọt (Sodium Bicarbonate). Vũng axit sủi bọt khí mạnh và đã chuyển thành muối trung tính pH 7.0 hoàn toàn vô hại!"
              : "Hoàn hảo! Em đã sử dụng giấy lau chuyên dụng thấm dọn sạch sẽ toàn bộ muối sủi bọt trắng. Sàn phòng thí nghiệm đã khô ráo hoàn toàn!"
          }
          dialogSequence={
            !spillKitCompleted 
              ? ["CẢNH BÁO NGUY HẠI: Đừng chạm trực tiếp vào vũng axit H2SO4 cực nóng!", "Em bắt buộc phải đến tủ màu vàng lấy Hộp Spill Kit để có đầy đủ dụng cụ rải bột trung hòa trước nhé."]
              : undefined
          }
        >
          <group>
            {!spillNeutralizeCompleted ? (
              <>
                {/* Green toxic chemical puddle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <ringGeometry args={[0, 0.7, 32]} />
                  <meshStandardMaterial color="#22c55e" opacity={0.85} transparent roughness={0.1} />
                </mesh>
                {/* Toxic bubbles */}
                <mesh position={[-0.2, 0.04, 0.1]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <sphereGeometry args={[0.06, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
                <mesh position={[0.3, 0.03, -0.2]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <sphereGeometry args={[0.08, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
                <mesh position={[0.1, 0.04, 0.25]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <sphereGeometry args={[0.05, 16, 16]} />
                  <meshStandardMaterial color="#4ade80" roughness={0.1} />
                </mesh>
              </>
            ) : (
              <>
                {/* White neutralized foam/salt puddle */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <ringGeometry args={[0, 0.72, 32]} />
                  <meshStandardMaterial color="#f1f5f9" opacity={0.9} roughness={0.9} />
                </mesh>
                {/* Dry white foam mounds */}
                <mesh position={[-0.15, 0.03, 0.05]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <sphereGeometry args={[0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#ffffff" roughness={1.0} />
                </mesh>
                <mesh position={[0.2, 0.02, -0.1]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                  <sphereGeometry args={[0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#ffffff" roughness={1.0} />
                </mesh>
              </>
            )}
          </group>
        </InteractableItem>
      )}

      {/* Fire Extinguisher (Wall) - Trigger the beautiful PASS Quiz Overlay! */}
      <InteractableItem
        id="fire_ext_item"
        position={[-9.6, 1.5, 2]}
        label="Bình cứu hỏa CO2 (Click huấn luyện P.A.S.S)"
        type="action"
        visible={currentPhase >= 2}
        disabled={currentPhase < 2}
        isGlowing={currentPhase === 2 && !player.inventory.hasFireExtinguisher}
        dialogSequence={[
          "Bình cứu hỏa CO2 là thiết bị quan trọng dùng để dập tắt nhanh các đám cháy điện hoặc hóa chất nhỏ.",
          "Chúng ta sẽ tiến hành Quy trình kiểm tra huấn luyện P.A.S.S chuẩn ngay bây giờ."
        ]}
        dialogCallback={() => {
          setShowFireExtinguisherQuiz(true);
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <Cylinder args={[0.15, 0.15, 0.8, 16]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
          </Cylinder>
          <mesh position={[0, 0.4, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, 0.4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <boxGeometry args={[0.12, 0.02, 0.03]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          {/* Detailed Pressure Gauge */}
          <group position={[0.11, 0.35, 0.05]} rotation={[0, 0.5, 0]}>
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.011]}>
              <cylinderGeometry args={[0.035, 0.035, 0.001, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0.01, 0.012]}>
              <boxGeometry args={[0.02, 0.001, 0.015]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0, 0, 0.013]} rotation={[0, 0, -0.4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.002, 0.03, 0.002]} />
              <meshBasicMaterial color="#eab308" />
            </mesh>
          </group>
          {/* Black Nozzle Hose & Flared Horn */}
          <group position={[-0.1, 0.3, 0]}>
            <mesh position={[0.08, -0.22, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <cylinderGeometry args={[0.016, 0.016, 0.4, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
            <mesh position={[0.08, -0.45, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <coneGeometry args={[0.05, 0.12, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
          </group>
        </group>
      </InteractableItem>

      {/* Fume Hood placeholder with detailed geometry */}
      <group position={[-9.2, 1.5, -4]}>
        {/* Main Chamber */}
        <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[1.5, 3, 2]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.4} />
        </mesh>
        {/* Transparent sliding glass shield */}
        <mesh position={[0.76, 0.5, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <boxGeometry args={[0.05, 1.2, 1.8]} />
          <meshStandardMaterial color="#38bdf8" opacity={0.45} transparent roughness={0.05} />
        </mesh>
        {/* Fume Exhaust pipe */}
        <mesh position={[0, 1.6, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
          <cylinderGeometry args={[0.22, 0.22, 0.4, 16]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* ULTRA-DETAILED TEACHER NPC MODEL */}
      <InteractableItem 
        id="teacher" 
        position={[2, 0.8, -5]} 
        label="Thầy Giáo Hóa Học" 
        type="action"
        dialogSequence={teacherDialog.seq}
        dialogCallback={teacherDialog.onComplete}
        isGlowing={
          !talkCompleted || 
          (rulesCompleted && gogglesCompleted && coatCompleted && glovesCompleted && maskCompleted && hairCompleted && shoesCompleted && currentPhase === 1) || 
          (fireExtCompleted && chemicalSymbolsCompleted && acidCompleted && currentPhase === 2) ||
          (spillWipeCompleted && currentPhase === 3 && (player.flags.trashCount === 0 || player.flags.trashCount === 3))
        }
      >
        <TeacherModel />
      </InteractableItem>

      {/* Hộp tủ sơ cứu y tế - Interactive in Phase 2, decorative in others */}
      <InteractableItem
        id="bandage_station"
        position={[-9.7, 2.2, 4.0]}
        label="Hộp tủ sơ cứu y tế (Quấn băng gạc)"
        type="action"
        taskId="task_bandage"
        isGlowing={currentPhase === 2 && !bandageCompleted}
        dialogSequence={
          currentPhase === 2 && !bandageCompleted
            ? [
                "Chào mừng em đến với Trạm huấn luyện Sơ Cứu phòng thí nghiệm!",
                "Khi xảy ra tai nạn như bỏng axit nhẹ hoặc rách da do mảnh vỡ thủy tinh, việc quấn băng gạc đúng cách là cực kỳ quan trọng.",
                "Hãy cùng thầy vượt qua bài huấn luyện quy trình 5 bước quấn băng gạc sơ cứu y tế an toàn nhé!"
              ]
            : ["Tủ sơ cứu chứa bông gạc, băng cá nhân, cồn, gel bôi bỏng và thuốc sát trùng khẩn cấp."]
        }
        dialogCallback={() => {
          if (currentPhase === 2 && !bandageCompleted) {
            setShowBandageQuiz(true);
          }
        }}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          <Box args={[0.3, 0.35, 0.08]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </Box>
          {/* White cross symbol on the red first aid box */}
          <group position={[0, 0, 0.042]}>
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.04, 0.16, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
              <boxGeometry args={[0.16, 0.04, 0.01]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>
      </InteractableItem>

      {/* --- Phase 3: Hazardous Chemical Trash Items --- */}
      {/* Chemical Sweeper Tool (Broom & Dustpan) - resting on Right Side Table */}
      {currentPhase === 3 && !player.inventory.hasSweeper && (
        <InteractableItem
          id="sweeper_tool"
          position={[6.0, 1.0, -5.5]}
          label="Dụng cụ quét dọn hóa chất (Chổi & Hốt rác)"
          type="action"
          isGlowing={currentPhase === 3 && !player.inventory.hasSweeper}
          dialogCallback={() => {
            useStore.setState((state: any) => ({
              player: {
                ...state.player,
                inventory: { ...state.player.inventory, hasSweeper: true }
              }
            }));
            useStore.getState().startDialog([
              "Em đã lấy thành công Dụng cụ chổi quét và hốt rác hóa chất chuyên dụng!",
              "Bây giờ em có thể tiến hành quét dọn các mảnh rác hóa chất rò rỉ trên sàn một cách an toàn.",
              "Lưu ý: Nếu dùng tay nhặt rác hóa chất trực tiếp mà không dùng dụng cụ quét dọn, em sẽ bị phạt -10 điểm vì vi phạm an toàn!"
            ]);
          }}
        >
          <group rotation={[0.2, 0.5, 0]}>
            {/* Broom Handle */}
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
              <meshStandardMaterial color="#eab308" roughness={0.3} /> {/* Yellow handle */}
            </mesh>
            {/* Broom Bristles base */}
            <mesh position={[0, -0.2, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.12, 0.05, 0.03]} />
              <meshStandardMaterial color="#22c55e" roughness={0.8} /> {/* Green brush head */}
            </mesh>
            {/* Dustpan handle */}
            <mesh position={[0.08, -0.05, 0]} rotation={[0, 0, -0.1]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
              <meshStandardMaterial color="#475569" roughness={0.4} />
            </mesh>
            {/* Dustpan scoop */}
            <mesh position={[0.08, -0.2, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <boxGeometry args={[0.14, 0.04, 0.14]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.flags.trash1Picked && (
        <InteractableItem
          id="trash_1"
          position={[-3.0, 0.15, 2.5]}
          label="Vỏ chai nhựa rỗng (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.inventory.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            useStore.setState((state: any) => ({
              player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: 'domestic' }, flags: { ...state.player.flags, trash1Picked: true } }
            }));
            useStore.getState().startDialog([
              "Em đã nhặt một vỏ chai nhựa rỗng (Rác sinh hoạt).",
              "Hãy phân loại đúng và bỏ vào Thùng rác sinh hoạt (màu xanh/đen) nhé!"
            ]);
          }}
        >
          <group>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.06, 0.06, 0.2, 12]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.3} opacity={0.6} transparent />
            </mesh>
            <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.02, 0.02, 0.05, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.6} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.flags.trash2Picked && (
        <InteractableItem
          id="trash_2"
          position={[4.5, 0.15, -4.5]}
          label="Khăn lau dính hóa chất (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.inventory.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            if (!player.inventory.hasSweeper) {
              useStore.getState().addError('general_error', { penalty: 10 });
              useStore.setState((state: any) => ({
                player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: 'chemical' }, flags: { ...state.player.flags, trash2Picked: true } }
              }));
              useStore.getState().startDialog([
                "CẢNH BÁO: Em nhặt trực tiếp rác hóa chất nguy hại mà không dùng dụng cụ chuyên dụng!",
                "Bị phạt -10 ĐIỂM! Lần sau phải dùng chổi quét/đồ hốt rác."
              ]);
            } else {
              useStore.setState((state: any) => ({
                player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: 'chemical' }, flags: { ...state.player.flags, trash2Picked: true } }
              }));
              useStore.getState().startDialog([
                "Rất tốt! Nhặt rác hóa chất bằng dụng cụ an toàn.",
                "Giờ hãy phân loại đúng và bỏ vào Thùng Rác Hóa Chất (màu vàng)!"
              ]);
            }
          }}
        >
          <group>
            <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <dodecahedronGeometry args={[0.1]} />
              <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.6} roughness={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.04, 0]}>
              <ringGeometry args={[0.15, 0.2, 16]} />
              <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {currentPhase === 3 && !player.flags.trash3Picked && (
        <InteractableItem
          id="trash_3"
          position={[-2.0, 0.15, -3.5]}
          label="Ống nghiệm thủy tinh vỡ (Click nhặt)"
          type="action"
          requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
          dialogCallback={() => {
            if (player.inventory.isHoldingTrash) {
              useStore.getState().startDialog(["Bạn đang cầm một mẩu rác rồi, hãy phân loại và vứt đi đã!"]);
              return;
            }
            if (!player.inventory.hasSweeper) {
              useStore.getState().addError('general_error', { penalty: 10 });
              useStore.setState((state: any) => ({
                player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: 'sharps' }, flags: { ...state.player.flags, trash3Picked: true } }
              }));
              useStore.getState().startDialog([
                "CẢNH BÁO: Nhặt thủy tinh vỡ bằng tay có thể làm rách găng và đứt tay!",
                "Bị phạt -10 ĐIỂM! Lần sau phải dùng chổi quét. Hãy bỏ rác vào Thùng Rác Vật Sắc Nhọn (màu vàng)!"
              ]);
            } else {
              useStore.setState((state: any) => ({
                player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: true, heldTrashType: 'sharps' }, flags: { ...state.player.flags, trash3Picked: true } }
              }));
              useStore.getState().startDialog([
                "Rất tốt! Nhặt mảnh vỡ an toàn.",
                "Hãy phân loại đúng và bỏ vào Thùng Rác Vật Sắc Nhọn / Thủy Tinh Vỡ!"
              ]);
            }
          }}
        >
          <group>
            <mesh rotation={[0, 0, Math.PI / 4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.02, 0.01, 0.15, 6]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
            </mesh>
            <mesh position={[0.05, -0.05, 0.05]} rotation={[0, Math.PI/3, Math.PI / 4]} castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"}>
              <cylinderGeometry args={[0.02, 0.01, 0.08, 6]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.1} opacity={0.9} transparent />
            </mesh>
          </group>
        </InteractableItem>
      )}

      {/* --- Phase 3: Yellow Chemical Biohazard Trash Bin --- */}
      {currentPhase === 3 && (
        <group>
          {/* Bin 1: Domestic (Sinh hoạt) */}
          <InteractableItem
            id="domestic_trash_can"
            position={[9.5, 0.45, 6.0]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Rác Sinh Hoạt (Màu Xanh lá)"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.inventory.isHoldingTrash && player.inventory.heldTrashType === 'domestic'}
            dialogCallback={() => {
              if (!player.inventory.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng rác sinh hoạt. Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.inventory.heldTrashType !== 'domestic') {
                useStore.getState().addError('general_error', { penalty: 5 });
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Em đã vứt nhầm rác vào Thùng Sinh Hoạt.", "Bị phạt -5 ĐIỂM! Khăn lau hóa chất hoặc thủy tinh vỡ không được bỏ vào đây."]);
                return;
              }
              const newTrashCount = player.flags.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: false, heldTrashType: null }, flags: { ...state.player.flags, trashCount: newTrashCount } } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt rác. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 16]} />
                <meshStandardMaterial color="#16a34a" roughness={0.5} />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, 0.2, 0.26]} fontSize={0.06} color="#ffffff" anchorX="center" anchorY="middle">SINH HOẠT</Text>
              {player.inventory.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#4ade80" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>

          {/* Bin 2: Chemical (Hóa chất) */}
          <InteractableItem
            id="chemical_trash_can"
            position={[9.5, 0.45, 7.5]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Rác Hóa Chất Nguy Hại (Màu Vàng)"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.inventory.isHoldingTrash && player.inventory.heldTrashType === 'chemical'}
            dialogCallback={() => {
              if (!player.inventory.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng Rác Hóa Chất Nguy Hại chuyên dụng. Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.inventory.heldTrashType !== 'chemical') {
                useStore.getState().addError('general_error', { penalty: 5 });
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Đây là thùng dành riêng cho rác dính hóa chất.", "Bị phạt -5 ĐIỂM! Rác sinh hoạt hoặc thủy tinh vỡ nên bỏ đúng thùng."]);
                return;
              }
              const newTrashCount = player.flags.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: false, heldTrashType: null }, flags: { ...state.player.flags, trashCount: newTrashCount } } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt rác hóa chất an toàn. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 16]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.1, 0.26]} rotation={[0, 0, 0]}>
                <circleGeometry args={[0.08, 32]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, -0.05, 0.26]} fontSize={0.05} color="#000000" anchorX="center" anchorY="middle">HÓA CHẤT</Text>
              {player.inventory.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#fef08a" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>

          {/* Bin 3: Sharps (Vật sắc nhọn) */}
          <InteractableItem
            id="sharps_trash_can"
            position={[9.5, 0.45, 9.0]}
            rotation={[0, -Math.PI / 4, 0]}
            label="Thùng Vật Sắc Nhọn / Thủy tinh vỡ"
            type="action"
            requiredEquipment={['hasGoggles', 'hasLabCoat', 'hasGloves', 'hasMask']}
            isGlowing={currentPhase === 3 && player.inventory.isHoldingTrash && player.inventory.heldTrashType === 'sharps'}
            dialogCallback={() => {
              if (!player.inventory.isHoldingTrash) {
                useStore.getState().startDialog(["Thùng Vật Sắc Nhọn (Thủy tinh vỡ, kim tiêm, dao mổ). Em hãy đi nhặt rác để bỏ vào đây nhé!"]);
                return;
              }
              if (player.inventory.heldTrashType !== 'sharps') {
                useStore.getState().addError('general_error', { penalty: 5 });
                useStore.getState().startDialog(["SAI QUY ĐỊNH! Đây là thùng dành riêng cho vật sắc nhọn/thủy tinh vỡ.", "Bị phạt -5 ĐIỂM! Rác sinh hoạt hoặc khăn lau hóa chất phải bỏ thùng khác."]);
                return;
              }
              const newTrashCount = player.flags.trashCount + 1;
              useStore.setState((state: any) => ({ player: { ...state.player, inventory: { ...state.player.inventory, isHoldingTrash: false, heldTrashType: null }, flags: { ...state.player.flags, trashCount: newTrashCount } } }));
              if (newTrashCount < 3) {
                useStore.getState().startDialog([`Xoẹt! Đã vứt thủy tinh vỡ an toàn. Tiến độ: ${newTrashCount}/3 mẩu rác.`]);
              } else {
                completeTask('task_trash_disposal');
                useStore.getState().startDialog([`Tuyệt vời! Hoàn thành bỏ mẩu rác thứ 3. Em đã hoàn thành 100% khóa học!`, `Trò chơi kết thúc, hãy xem chứng chỉ của em!`]);
              }
            }}
          >
            <group>
              <mesh castShadow={settings.graphicsQuality === "ultra" || settings.graphicsQuality === "high"} receiveShadow={settings.graphicsQuality !== "potato" && settings.graphicsQuality !== "low"}>
                <cylinderGeometry args={[0.25, 0.2, 0.9, 4]} />
                <meshStandardMaterial color="#facc15" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.1, 0.22]} rotation={[0, Math.PI/4, 0]}>
                <planeGeometry args={[0.1, 0.1]} />
                <meshStandardMaterial color="#000000" />
              </mesh>
              <Text font={VIETNAMESE_FONT} position={[0, -0.05, 0.22]} rotation={[0, Math.PI/4, 0]} fontSize={0.04} color="#000000" anchorX="center" anchorY="middle">SẮC NHỌN</Text>
              {player.inventory.isHoldingTrash && <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.44, 0]}><ringGeometry args={[0.4, 0.5, 32]} /><meshBasicMaterial color="#fef08a" opacity={0.6} transparent /></mesh>}
            </group>
          </InteractableItem>
        </group>
      )}

      {/* Dashed Guide Arrow Line connecting player to the active task */}
      {targetPos && (
        <DashedGuideLine end={targetPos} />
      )}

    </group>
  );
};
