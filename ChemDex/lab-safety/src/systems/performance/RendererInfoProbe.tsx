import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { fireSimulation } from '../../core/fire/FireSim';
import { playerCoords, useStore } from '../../store/useStore';
import { inputManager } from '../input/InputManager';
import * as THREE from 'three';
import { useInteractionStore } from '../../core/InteractionSystem';

export interface RendererInfoSnapshot {
  timestamp: number;
  mirrorUpdates?: number;
  shadowEnabled?: boolean;
  pixelRatio?: number;
  visibleFlames?: number;
  heldTool?: string | null;
  render: {
    calls: number;
    triangles: number;
    points: number;
    lines: number;
  };
  memory: {
    geometries: number;
    textures: number;
  };
}

export interface LabDebugStateSnapshot {
  cameraRotation: [number, number];
  focusId: string | null;
  detectedRing: boolean;
  cinematic: string | null;
  wasteSampleCount: number;
  cameraPosition: [number, number, number];
  apparatusDetails: boolean;
  currentPhase: number;
  view: string;
  runState: string;
  fireSourceCount: number;
  activeFireCellCount: number;
  playerPosition: [number, number, number];
  input: {
    move: [number, number];
    joystickPointerId: number | null;
    lookPointerId: number | null;
    run: boolean;
  };
}

declare global {
  interface Window {
    __LAB_RENDERER_INFO__?: RendererInfoSnapshot;
    __LAB_DEBUG_STATE__?: LabDebugStateSnapshot;
    __LAB_SET_PLAYER_POSE__?: (position: [number, number, number], rotationY: number) => void;
  }
}

export const RendererInfoProbe = () => {
  const { gl, scene, camera } = useThree();
  const lastSample = useRef(-Infinity);
  const cameraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const snapshot = useRef<RendererInfoSnapshot>({
    timestamp: 0,
    render: { calls: 0, triangles: 0, points: 0, lines: 0 },
    memory: { geometries: 0, textures: 0 },
  });

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastSample.current >= 1) {
      lastSample.current = elapsed;
      const target = snapshot.current;
      target.timestamp = performance.now();
      target.mirrorUpdates = scene.getObjectByName('player-mirror')?.userData.updateCount ?? 0;
      target.shadowEnabled = gl.shadowMap.enabled;
      target.pixelRatio = gl.getPixelRatio();
      const flames = scene.getObjectByName('fire-effects')?.children[0];
      target.visibleFlames = flames?.visible ? ((flames as any).count ?? 0) : 0;
      target.heldTool = ['extinguisher', 'spillKit', 'waste'].find(t => scene.getObjectByName(`held-${t}`)) ?? null;
      target.render.calls = gl.info.render.calls;
      target.render.triangles = gl.info.render.triangles;
      target.render.points = gl.info.render.points;
      target.render.lines = gl.info.render.lines;
      target.memory.geometries = gl.info.memory.geometries;
      target.memory.textures = gl.info.memory.textures;
      window.__LAB_RENDERER_INFO__ = target;

      const state = useStore.getState();
      cameraEuler.current.setFromQuaternion(camera.quaternion, 'YXZ');
      window.__LAB_DEBUG_STATE__ = {
        cameraRotation: [cameraEuler.current.x, cameraEuler.current.y],
        focusId: useInteractionStore.getState().nearestId,
        detectedRing: !!scene.getObjectByName('detected-item-green-ring'),
        cinematic: state.cinematic,
        wasteSampleCount: ['paper', 'glass', 'absorbent'].filter(id => scene.getObjectByName(`waste-sample-${id}`)).length,
        cameraPosition: camera.position.toArray() as [number, number, number],
        apparatusDetails: !!scene.getObjectByName('apparatus-fine-details'),
        currentPhase: state.currentPhase,
        view: state.view,
        runState: state.runState,
        fireSourceCount: fireSimulation.sources.length,
        activeFireCellCount: fireSimulation.sources.reduce(
          (count, source) => count + source.cells.filter((cell) => cell.intensity > 0.05).length,
          0,
        ),
        playerPosition: [...playerCoords.position],
        input: {
          move: [inputManager.move.x, inputManager.move.y],
          joystickPointerId: inputManager.joystickPointerId,
          lookPointerId: inputManager.lookPointerId,
          run: inputManager.buttons.run,
        },
      };
    }

    // With autoReset disabled, these are the complete previous-frame counters.
    // Reset now so the upcoming R3F/effect-composer render starts from zero.
    gl.info.reset();
  });

  useEffect(() => {
    const previousAutoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    window.__LAB_SET_PLAYER_POSE__ = (position, rotationY) => {
      playerCoords.position = [...position];
      playerCoords.rotationY = rotationY;
      playerCoords.isMoving = false;
    };

    return () => {
      delete window.__LAB_RENDERER_INFO__;
      delete window.__LAB_DEBUG_STATE__;
      delete window.__LAB_SET_PLAYER_POSE__;
      gl.info.autoReset = previousAutoReset;
      gl.info.reset();
    };
  }, [gl]);

  return null;
};
