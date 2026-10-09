import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../store/useStore';
import { useInteractionStore } from '../../core/InteractionSystem';
import { PlayerState } from '../../types';
import { SAFETY_RULES } from '../../data/rules';

interface Props {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
  children: React.ReactNode;
  type: 'equip' | 'action' | 'learn';
  equipKey?: any;
  taskId?: string;
  ruleId?: number;
  requiredEquipment?: (any)[];
  successMessage?: string;
  dialogSequence?: string[];
  dialogCallback?: () => void;
  visible?: boolean;
  disabled?: boolean;
  isGlowing?: boolean;
}

let lastInteractionTime = 0;
const GLOBAL_COOLDOWN_MS = 600;

export const InteractableItem: React.FC<Props> = ({ 
  id, position, label, children, type, equipKey, taskId, ruleId, requiredEquipment, successMessage, dialogSequence, dialogCallback,
  visible = true, disabled = false, isGlowing = false, rotation
}) => {
  const group = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const hintRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [animating, setAnimating] = useState(false);

  const isCompleted = useStore((s) => s.tasks.find((t) => t.id === taskId)?.completed);
  const player = useStore((s) => s.player);
  const completeTask = useStore((s) => s.completeTask);
  const equipItem = useStore((s) => s.equipItem);
  const setActiveRuleDialog = useStore((s) => s.setActiveRuleDialog);
  const addError = useStore((s) => s.addError);
  const startDialog = useStore((s) => s.startDialog);
  const isDialogActive = useStore((s) => s.isDialogActive);

  const nearestId = useInteractionStore((s) => s.nearestId);
  const register = useInteractionStore((s) => s.register);
  const unregister = useInteractionStore((s) => s.unregister);

  const isActive = visible && !disabled && !(type === 'equip' && isCompleted);
  const showPrompt = nearestId === id && isActive;

  useEffect(() => {
    register({ id, position, label, isActive });
    return () => unregister(id);
  }, [id, position, label, isActive, register, unregister]);

  useFrame((state) => {
    if (group.current && !animating && !disabled) {
      if (hovered) {
        group.current.scale.lerp(new THREE.Vector3(1.08, 1.08, 1.08), 0.1);
      } else {
        group.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
    
    if (glowRef.current) {
      const scaleVal = 1 + Math.sin(state.clock.getElapsedTime() * 6) * 0.15;
      glowRef.current.scale.set(scaleVal, scaleVal, scaleVal);
    }

    if (hintRef.current) {
      const bob = Math.sin(state.clock.getElapsedTime() * 5) * 0.08;
      hintRef.current.position.y = 1.05 + bob;
      hintRef.current.rotation.y = state.clock.getElapsedTime() * 2.5;
    }
  });

  const { y, rotationY } = useSpring({
    y: animating ? 1.5 : 0,
    rotationY: animating ? Math.PI * 4 : 0,
    config: { mass: 1, tension: 170, friction: 26 },
    onRest: () => {
      if (animating) {
        if (equipKey) equipItem(equipKey);
        if (taskId) completeTask(taskId);
        lastInteractionTime = Date.now();
      }
    }
  });

  const handleClick = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (disabled) return;

    const now = Date.now();
    if (now - lastInteractionTime < GLOBAL_COOLDOWN_MS) return;
    lastInteractionTime = now;
    
    const dx = playerCoords.position[0] - position[0];
    const dz = playerCoords.position[2] - position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2.5) {
      startDialog([`CẢNH BÁO: Hãy lại gần hơn để tương tác.`]);
      return;
    }
    
    if (requiredEquipment) {
      const missing = requiredEquipment.filter(key => !(key in player.equipment ? (player.equipment as any)[key] : key in player.inventory ? (player.inventory as any)[key] : (player.flags as any)[key]));
      if (missing.length > 0) {
        addError('general_error');
        const vietnameseNames: Record<string, string> = {
          hasGoggles: 'Kính bảo hộ',
          hasLabCoat: 'Áo Blouse',
          hasGloves: 'Găng tay',
          hasMask: 'Khẩu trang phòng độc',
          hairTied: 'Tóc buộc gọn',
          hasClosedShoes: 'Giày kín mũi'
        };
        const missingLabels = missing.map(m => vietnameseNames[m] || m).join(', ');
        startDialog([`CẢNH BÁO: Em chưa trang bị đầy đủ đồ bảo hộ cần thiết! Hãy trang bị thêm: ${missingLabels}`]);
        return;
      }
    }

    if (dialogSequence) {
      startDialog(dialogSequence, dialogCallback);
    } else if (dialogCallback) {
      dialogCallback();
    }

    if (type === 'equip' && equipKey) {
      setAnimating(true);
    } else if (type === 'action') {
      if (equipKey) equipItem(equipKey);
      if (taskId) completeTask(taskId);
      if (successMessage && !dialogSequence) {
        startDialog([successMessage]);
      }
    } else if (type === 'learn') {
      if (ruleId) {
        const rule = SAFETY_RULES.find(r => r.id === ruleId);
        if (rule) setActiveRuleDialog(rule);
      }
      if (taskId) completeTask(taskId);
    }
  };

  const handleClickRef = useRef(handleClick);
  useEffect(() => {
    handleClickRef.current = handleClick;
  }, [handleClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        if (disabled) return;
        if (type === 'equip' && isCompleted) return;
        if (isDialogActive) return;
        
        if (showPrompt) {
          e.preventDefault();
          handleClickRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrompt, disabled, isCompleted, isDialogActive]);

  if (!visible) return null;

  return (
    <group 
      ref={group} 
      position={position} 
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <a.group position-y={y} rotation-y={rotationY}>
        {children}
      </a.group>

      {showPrompt && !disabled && !(type === 'equip' && isCompleted) && (
        <Html position={[0, 1.8, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div 
            onClick={handleClick}
            className="flex items-center gap-2 px-3 py-1.5 white-glass rounded-xl shadow-lg border border-[var(--primary)] text-xs font-bold text-[var(--ink)] cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
          >
            <kbd className="px-1.5 py-0.5 rounded bg-cyan-100 text-[var(--primary-600)] font-mono text-[10px] border border-cyan-200">
              E
            </kbd>
            <span>{label}</span>
          </div>
        </Html>
      )}

      {isGlowing && !isCompleted && (
        <mesh ref={glowRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshBasicMaterial color="#0ea5b7" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isGlowing && !isCompleted && (
        <mesh ref={hintRef} position={[0, 1.2, 0]}>
          <coneGeometry args={[0.15, 0.35, 16]} />
          <meshStandardMaterial color="#0ea5b7" emissive="#0ea5b7" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
};
