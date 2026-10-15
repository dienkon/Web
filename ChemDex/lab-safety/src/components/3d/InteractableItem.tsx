import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { isSceneInputBlocked } from '../../systems/input/sceneInput';
import { getActiveObjective } from './lab/ObjectiveMarker';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../store/useStore';
import { useInteractionStore } from '../../core/InteractionSystem';
import { PlayerState } from '../../types';
import { SAFETY_RULES } from '../../data/rules';
import { interactionBus, INTERACTION_PRIORITY } from '../../systems/input/InteractionBus';

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

  const nearestId = useInteractionStore((s) => s.nearestId);
  const register = useInteractionStore((s) => s.register);
  const unregister = useInteractionStore((s) => s.unregister);

  const inputBlocked = useStore(isSceneInputBlocked);
  const worldPosition = useRef(new THREE.Vector3());
  const currentPhase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const objective = getActiveObjective(currentPhase, tasks, player.flags);
  const isCurrentTask = !taskId || objective?.id === taskId;
  const isActive = isCurrentTask && !inputBlocked && !animating && visible && !disabled && !(type === 'equip' && (isCompleted || (equipKey && (player.equipment as any)[equipKey])));
  const showPrompt = nearestId === id && isActive;

  useEffect(() => {
    group.current?.updateWorldMatrix(true, false);
    group.current?.getWorldPosition(worldPosition.current);
    const bounds = new THREE.Box3().setFromObject(group.current!);
    const center = bounds.isEmpty() ? worldPosition.current.clone() : bounds.getCenter(new THREE.Vector3());
    if (id === 'teacher_talk') center.y = 1.2;
    const size = bounds.isEmpty() ? new THREE.Vector3(.4, .4, .4) : bounds.getSize(new THREE.Vector3());
    register({
      id,
      position: worldPosition.current.toArray() as [number, number, number],
      aimPosition: center.toArray() as [number, number, number],
      label,
      isActive,
      radius: Math.max(.16, Math.min(.42, Math.max(size.x, size.y) * .3)),
      reach: id === 'teacher_talk' ? 2.4 : 2.15,
      object: group.current ?? undefined,
    });
    return () => unregister(id);
  }, [id, position, label, isActive, register, unregister]);

  useFrame((state) => {
    if (group.current && !animating && !disabled) {
      if (hovered) {
        group.current.scale.setScalar(1.015);
      } else {
        group.current.scale.setScalar(1);
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
    if (!isActive || isSceneInputBlocked() || useInteractionStore.getState().nearestId !== id) return;

    const now = Date.now();
    if (now - lastInteractionTime < GLOBAL_COOLDOWN_MS) return;
    lastInteractionTime = now;
    
    const dx = playerCoords.position[0] - worldPosition.current.x;
    const dz = playerCoords.position[2] - worldPosition.current.z;
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
      if (taskId && !dialogCallback) completeTask(taskId);
    }
  };

  const handleClickRef = useRef(handleClick);
  useEffect(() => {
    handleClickRef.current = handleClick;
  }, [handleClick]);

  useEffect(() => {
    return interactionBus.subscribe({
      priority: INTERACTION_PRIORITY.TARGET,
      isActive: () => showPrompt && !disabled && !(type === 'equip' && isCompleted),
      onInteract: () => handleClickRef.current(),
    });
  }, [showPrompt, disabled, type, isCompleted]);

  if (!visible) return null;

  return (
    <group 
      ref={group} 
      position={position} 
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); if (isActive) setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <a.group position-y={y} rotation-y={rotationY}>
        {children}
      </a.group>


    </group>
  );
};
