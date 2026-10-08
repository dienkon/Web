import React from 'react';
import { LabBaseRoom } from './Architecture';
import { PPEStation } from './PPEStation';
import { SafetyWall } from './SafetyWall';
import { IslandBenches } from './Benches';
import { FumeHood } from './FumeHood';
import { StorageCabinets } from './StorageCabinets';
import { WasteStation } from './WasteStation';
import { HandwashSink } from './Sinks';
import { LabDecor } from './Decor';

export const LabStandardRoom: React.FC = () => {
  return (
    <group>
      {/* 1. Core Architecture (Walls, floor, ceiling, doors A & B) */}
      <LabBaseRoom />

      {/* 2. Entrance & Preparation (PPE Station, Handwash Sink) */}
      <PPEStation />
      <HandwashSink />

      {/* 3. West Wall (Emergency Safety Wall) */}
      <SafetyWall />

      {/* 4. Island Benches (4 benches with scenario equipment) */}
      <IslandBenches />

      {/* 5. Northeast Fume Hood */}
      <FumeHood />

      {/* 6. East Wall (Chemical Storage Cabinets & Shelving) */}
      <StorageCabinets />

      {/* 7. Southeast Waste Segregation Station */}
      <WasteStation />

      {/* 8. North Teaching Wall & Ambient Decor */}
      <LabDecor />
    </group>
  );
};
