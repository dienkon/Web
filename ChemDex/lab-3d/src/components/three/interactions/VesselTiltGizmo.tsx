import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface VesselTiltGizmoProps {
  rimY: number;
  radius: number;
  tiltAngle: number; // in radians
  onTiltChange: (angleRad: number) => void;
  visible: boolean;
}

export const VesselTiltGizmo = React.memo(function VesselTiltGizmo({
  rimY,
  radius,
  tiltAngle,
  onTiltChange,
  visible,
}: VesselTiltGizmoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startAngle = useRef(0);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startAngle.current = tiltAngle;

    const onPointerMove = (ev: MouseEvent) => {
      const dy = ev.clientY - dragStartY.current;
      // Dragging downward tilts vessel forward (0 to 180 degrees = π radians)
      const deltaAngle = (dy / 100) * 1.5;
      const newAngle = Math.max(0, Math.min(Math.PI, startAngle.current + deltaAngle));
      onTiltChange(newAngle);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (!visible && !isDragging) return null;

  const degrees = Math.round((tiltAngle * 180) / Math.PI);

  return (
    <group position={[0, rimY + 0.28, 0]}>
      {/* Semi-transparent Circular Tilt Control Ring */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'ns-resize';
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <torusGeometry args={[radius * 1.12, 0.038, 12, 36, Math.PI]} />
        <meshStandardMaterial
          color={isDragging ? '#10b981' : (isHovered ? '#38bdf8' : '#94a3b8')}
          transparent
          opacity={isDragging ? 0.95 : (isHovered ? 0.85 : 0.45)}
          roughness={0.2}
        />
      </mesh>

      {/* Tilt Drag Handle Bead at the Spout Vertex */}
      <mesh
        position={[0, 0, radius * 1.12]}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial
          color={isDragging ? '#10b981' : (isHovered ? '#0284c7' : '#64748b')}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Real-time Angle Readout Tag */}
      {(isDragging || isHovered || tiltAngle > 0.05) && (
        <group position={[0, 0.22, radius * 1.12]}>
          <mesh>
            <planeGeometry args={[0.42, 0.18]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.8} />
          </mesh>
          <Text
            fontSize={0.08}
            color="#ffffff"
            position={[0, 0, 0.02]}
            anchorX="center"
            anchorY="middle"
          >
            {degrees}°
          </Text>
        </group>
      )}
    </group>
  );
});
