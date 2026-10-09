import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { fireSimulation } from '../../../core/fire/FireSim';
import { ExtinguisherStream } from '../fx/ExtinguisherStream';
import { soundManager } from '../../../audio/soundManager';
import { spatialSound } from '../../../audio/SpatialSoundEngine';

const FIRE_ORIGIN: [number, number, number] = [4.2, 0.95, -2.2];

export const FireEmergencyScenario: React.FC = () => {
  const { camera } = useThree();
  const currentPhase = useStore((s) => s.currentPhase);
  const tasks = useStore((s) => s.tasks);
  const player = useStore((s) => s.player);
  const completeTask = useStore((s) => s.completeTask);
  const startDialog = useStore((s) => s.startDialog);

  const [fireIntensity, setFireIntensity] = useState(1.0);
  const [isExtinguished, setIsExtinguished] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const prevYawRef = useRef(0);
  const sweepAccumulator = useRef(0);
  const hasTriggeredComplete = useRef(false);

  const isFireTaskDone = !!tasks.find((t) => t.id === 'task_fire_extinguisher')?.completed;

  // Initialize fire in simulation when Phase 2 starts
  useEffect(() => {
    if (currentPhase >= 2 && !isFireTaskDone && fireSimulation.sources.length === 0) {
      fireSimulation.spawnFire('bench_fire_b', 'B', FIRE_ORIGIN);
      fireSimulation.equipExtinguisher('co2');
      setIsExtinguished(false);
      setFireIntensity(1.0);
    }
  }, [currentPhase, isFireTaskDone]);

  // Keyboard shortcut 'R' to pull safety pin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'KeyR' || e.code === 'KeyP') && player.inventory.hasFireExtinguisher) {
        if (fireSimulation.currentExtinguisher && !fireSimulation.currentExtinguisher.pinPulled) {
          fireSimulation.pullPin();
          soundManager.play('snap');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player.inventory.hasFireExtinguisher]);

  // Frame update: handle discharge, raycast aiming, and sweep
  useFrame((_, delta) => {
    if (currentPhase < 2 || isFireTaskDone || isExtinguished) return;

    const ext = fireSimulation.currentExtinguisher;
    if (!ext) return;

    // Detect if mouse left click is held while holding extinguisher
    const isMouseDown = (window as any).__mouseLeftDown || false;
    const canDischarge = Boolean(player.inventory.hasFireExtinguisher && ext.pinPulled && isMouseDown);
    setIsDischarging(canDischarge);
    ext.isDischarging = canDischarge;

    if (canDischarge) {
      spatialSound.startExtinguisherHiss();
    } else {
      spatialSound.stopExtinguisherHiss();
    }

    // Track horizontal sweeping (yaw changes)
    const currentYaw = playerCoords.rotationY;
    const dYaw = Math.abs(currentYaw - prevYawRef.current);
    prevYawRef.current = currentYaw;
    sweepAccumulator.current = THREE.MathUtils.lerp(sweepAccumulator.current, dYaw * 20, delta * 5);

    if (canDischarge) {
      // Raycast from camera center forward (Aim vector)
      const raycaster = new THREE.Raycaster();
      raycaster.set(camera.position, camera.getWorldDirection(new THREE.Vector3()));

      // Target point 3.5m forward along aim vector
      const targetPoint = camera.position
        .clone()
        .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3.5));

      // Check if aiming at base of flame (Y close to bench surface)
      const isAimingAtBase = targetPoint.y <= FIRE_ORIGIN[1] + 0.45;

      // Discharge extinguisher onto fire simulation
      fireSimulation.dischargeAtTarget(
        [targetPoint.x, targetPoint.y, targetPoint.z],
        isAimingAtBase,
        sweepAccumulator.current,
        delta
      );
    }

    // Update overall fire intensity for UI
    const source = fireSimulation.sources.find((s) => s.id === 'bench_fire_b');
    if (source && source.cells.length > 0) {
      const currentCell = source.cells[0];
      setFireIntensity(currentCell.intensity);

      if (currentCell.intensity <= 0.05 && !hasTriggeredComplete.current) {
        hasTriggeredComplete.current = true;
        setIsExtinguished(true);
        completeTask('task_fire_extinguisher');
        soundManager.play('complete');
        startDialog([
          'ĐÁM CHÁY ĐÃ ĐƯỢC DẬP TẮT HOÀN TOÀN!',
          'Xuất sắc! Em đã thực hiện chuẩn xác 4 bước P.A.S.S:',
          '1. Pull: Rút chốt an toàn.',
          '2. Aim: Ngắm chuẩn xác vào GỐC đám cháy.',
          '3. Squeeze: Bóp cò phụt khí CO2 dập lửa.',
          '4. Sweep: Quét vòi phun đều sang hai bên dập tắt triệt để.',
        ]);
      }
    }
  });

  // Track global mousedown state
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) (window as any).__mouseLeftDown = true;
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) (window as any).__mouseLeftDown = false;
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (currentPhase < 2 || isFireTaskDone) return null;

  return (
    <group>
      {/* 1. Active Extinguisher Particle Stream */}
      <ExtinguisherStream isDischarging={isDischarging} />

      {/* 2. Floating Fire Status Bar above Bench 2 */}
      {!isExtinguished && fireIntensity > 0.05 && (
        <Html position={[FIRE_ORIGIN[0], FIRE_ORIGIN[1] + 1.2, FIRE_ORIGIN[2]]} center distanceFactor={8}>
          <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
            <div className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-rose-500/60 shadow-xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                Đám cháy hóa chất Loại B
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {(fireIntensity * 100).toFixed(0)}%
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-36 h-2 bg-slate-900/90 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full transition-all duration-100"
                style={{ width: `${Math.max(0, Math.min(100, fireIntensity * 100))}%` }}
              />
            </div>

            {/* PASS Tip */}
            {player.inventory.hasFireExtinguisher && (
              <div className="text-[10px] text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                {!fireSimulation.currentExtinguisher?.pinPulled
                  ? 'Bấm [R] để Rút chốt an toàn!'
                  : 'Giữ [Chuột Trái] ngắm GỐC lửa & quét qua lại!'}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
