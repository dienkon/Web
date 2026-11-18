import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLabTour } from '../../store/useLabTour';
import { useAppStore } from '../../store/useAppStore';
import { LAB_TOUR_STEPS } from '../../data/labTour';
import { MousePointer2 } from 'lucide-react';
import { Vector3 } from 'three';
import { vesselContours } from '../../science/vesselContours';
import { vesselLocalToWorld } from '../../science/vesselScale';

/** A screen-space anchor follows the real vessel while the camera zooms in. */
export function TourVesselFocus() {
  const id = useLabTour(s => s.vesselId);
  const show = useLabTour(s => s.active && ['select-beaker', 'wait-water', 'finish'].includes(LAB_TOUR_STEPS[s.index].id));
  const vessel = useAppStore(s => id ? s.vessels[id] : null);
  const language = useAppStore(s => s.language);
  const anchor = useRef<HTMLDivElement>(null);
  const point = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    if (!show || !vessel || !anchor.current) return;
    const { outer } = vesselContours(vessel.type);
    const radius = Math.max(...outer.map(([r]) => r));
    const bottom = outer[0][1], top = outer[outer.length - 1][1];
    let left = Infinity, right = -Infinity, upper = Infinity, lower = -Infinity;
    for (const x of [-radius, radius]) for (const y of [bottom, top]) for (const z of [-radius, radius]) {
      point.current.set(...vesselLocalToWorld(vessel, [x, y, z])).project(camera);
      const px = (point.current.x + 1) * size.width / 2, py = (1 - point.current.y) * size.height / 2;
      left = Math.min(left, px); right = Math.max(right, px); upper = Math.min(upper, py); lower = Math.max(lower, py);
    }
    // Project the actual scaled body, rather than guessing a fixed-size cutout.
    left = Math.max(8, left - 6); right = Math.min(size.width - 8, right + 6);
    upper = Math.max(8, upper - 6); lower = Math.min(size.height - 8, lower + 36);
    Object.assign(anchor.current.style, { left: `${left}px`, top: `${upper}px`, width: `${Math.max(80, right - left)}px`, height: `${Math.max(60, lower - upper)}px` });
  });
  if (!show || !vessel) return null;
  return <Html calculatePosition={() => [0, 0]} zIndexRange={[85, 80]} style={{ pointerEvents: 'none' }}>
    <div ref={anchor} data-tour="practice-vessel" className="lab-tour-vessel-anchor">
      <button type="button" onClick={event => { event.stopPropagation(); useAppStore.getState().setSelectedVesselId(vessel.id); }}>
        <MousePointer2 size={13} />{language === 'vi' ? 'Chọn cốc này' : 'Select this beaker'}
      </button>
    </div>
  </Html>;
}
