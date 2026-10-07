import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../store/useStore';

export const ThirdPersonController: React.FC = () => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  const view = useStore(s => s.view);
  const isDialogActive = useStore(s => s.isDialogActive);
  const joystickVec = useStore(s => s.joystickVec) || { x: 0, y: 0 };
  
  // Track pressed keys
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'game' || isDialogActive) return;
      switch (e.code) {
        case 'KeyW': keys.current.w = true; break;
        case 'KeyS': keys.current.s = true; break;
        case 'KeyA': keys.current.a = true; break;
        case 'KeyD': keys.current.d = true; break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': keys.current.w = false; break;
        case 'KeyS': keys.current.s = false; break;
        case 'KeyA': keys.current.a = false; break;
        case 'KeyD': keys.current.d = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Prevent default context menu during game so right-click camera rotation is smooth
    const handleContextMenu = (e: MouseEvent) => {
      if (view === 'game') {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [view, isDialogActive]);

  useFrame((state, delta) => {
    if (view !== 'game') return;

    // If dialog is active, make sure player doesn't walk away
    if (isDialogActive) {
      playerCoords.isMoving = false;
      return;
    }

    const { w, a, s, d } = keys.current;
    const hasJoystickInput = joystickVec.x !== 0 || joystickVec.y !== 0;
    const hasInput = w || a || s || d || hasJoystickInput;
    
    if (hasInput) {
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

      const moveDir = new THREE.Vector3(0, 0, 0);
      if (w) moveDir.add(camDir);
      if (s) moveDir.add(camDir.clone().negate());
      if (a) moveDir.add(camRight.clone().negate());
      if (d) moveDir.add(camRight);

      if (hasJoystickInput) {
        const joyForward = camDir.clone().multiplyScalar(joystickVec.y);
        const joyRight = camRight.clone().multiplyScalar(joystickVec.x);
        moveDir.add(joyForward).add(joyRight);
      }

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();

        const speed = 3.0; // Walk speed m/s
        const deltaX = moveDir.x * speed * delta;
        const deltaZ = moveDir.z * speed * delta;

        let nextX = playerCoords.position[0] + deltaX;
        let nextZ = playerCoords.position[2] + deltaZ;

        if (nextX > 9.0) nextX = 9.0;
        if (nextX < -9.0) nextX = -9.0;
        if (nextZ > 9.0) nextZ = 9.0;
        if (nextZ < -9.0) nextZ = -9.0;

        const tables = [
          { minX: -4.4, maxX: 4.4, minZ: -1.9, maxZ: 1.9 },
          { minX: -8.3, maxX: -5.7, minZ: -7.0, maxZ: -5.0 },
          { minX: 5.7, maxX: 8.3, minZ: -7.0, maxZ: -5.0 },
          { minX: -8.3, maxX: -5.7, minZ: 4.0, maxZ: 6.0 },
          { minX: 5.7, maxX: 8.3, minZ: 4.0, maxZ: 6.0 }
        ];
        
        for (const table of tables) {
          const inTableX = nextX > table.minX && nextX < table.maxX;
          const inTableZ = nextZ > table.minZ && nextZ < table.maxZ;
          
          if (inTableX && inTableZ) {
            const currentX = playerCoords.position[0];
            const currentZ = playerCoords.position[2];
            
            const wasOutsideX = currentX <= table.minX || currentX >= table.maxX;
            const wasOutsideZ = currentZ <= table.minZ || currentZ >= table.maxZ;
            
            if (wasOutsideX) {
              nextX = currentX;
            } else if (wasOutsideZ) {
              nextZ = currentZ;
            } else {
              nextX = currentX;
              nextZ = currentZ;
            }
          }
        }

        playerCoords.position[0] = nextX;
        playerCoords.position[2] = nextZ;

        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - playerCoords.rotationY;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        
        const rotSpeed = 12.0;
        playerCoords.rotationY += diff * rotSpeed * delta;
        playerCoords.isMoving = true;
      }
    } else {
      playerCoords.isMoving = false;
    }

    if (controlsRef.current) {
      const targetPos = new THREE.Vector3(playerCoords.position[0], playerCoords.position[1] + 1.0, playerCoords.position[2]);
      controlsRef.current.target.lerp(targetPos, 0.1);
      controlsRef.current.update();

      const wallLimitX = 9.5;
      const wallLimitZ = 9.5;
      
      if (camera.position.x < -wallLimitX) camera.position.x = -wallLimitX;
      if (camera.position.x > wallLimitX) camera.position.x = wallLimitX;
      if (camera.position.z < -wallLimitZ) camera.position.z = -wallLimitZ;
      if (camera.position.z > wallLimitZ) camera.position.z = wallLimitZ;
      if (camera.position.y < 0.3) camera.position.y = 0.3;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      rotateSpeed={0.6}
      enableDamping={false}
      minDistance={1.8}
      maxDistance={6.0}
      maxPolarAngle={Math.PI / 2 - 0.05} // don't go under floor
      minPolarAngle={Math.PI / 12}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE
      }}
    />
  );
};
