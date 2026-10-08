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
import { InteractiveTasks } from './InteractiveTasks';
import { ObjectiveMarker } from './ObjectiveMarker';
import { FireEmergencyScenario } from './FireEmergencyScenario';
import { AcidDilutionStation } from './AcidDilutionStation';
import { PHTestingMinigame } from './PHTestingMinigame';
import { HazardHuntManager } from './HazardHuntManager';
import { EmergencyShowerStation } from './EmergencyShowerStation';
import { InteractiveFumeHood } from './InteractiveFumeHood';
import { FirstAidTreatmentStation } from './FirstAidTreatmentStation';
import { ChemicalSpillSimulation } from './ChemicalSpillSimulation';
import { BunsenBurnerStation } from './BunsenBurnerStation';
import { ChemicalStorageStation } from './ChemicalStorageStation';

export const LabStandardRoom: React.FC = () => {
  return (
    <group>
      {/* 1. Core Architecture (Walls, floor, ceiling, doors A & B) */}
      <LabBaseRoom />

      {/* 2. Entrance & Preparation (PPE Station, Handwash Sink) */}
      <PPEStation />
      <HandwashSink />

      {/* 3. West Wall (Emergency Safety Wall + Interactive Shower & First Aid) */}
      <SafetyWall />
      <EmergencyShowerStation />
      <FirstAidTreatmentStation />

      {/* 4. Island Benches (4 benches with Bunsen Burner & Lab Equipment) */}
      <IslandBenches />
      <BunsenBurnerStation />

      {/* 5. Northeast Fume Hood (Base Shell + Interactive Sliding Sash & Vapors) */}
      <FumeHood />
      <InteractiveFumeHood />

      {/* 6. East Wall (Chemical Storage Cabinets & GHS Incompatibility Sorter) */}
      <StorageCabinets />
      <ChemicalStorageStation />

      {/* 7. Southeast Waste Segregation Station */}
      <WasteStation />

      {/* 8. North Teaching Wall & Ambient Decor */}
      <LabDecor />

      {/* 9. Interactive Task Collider Triggers & Prompt Logic */}
      <InteractiveTasks />

      {/* 10. 3D Animated Navigation Arrow & Sonar Waypoint */}
      <ObjectiveMarker />

      {/* 11. Real-time Physical Fire Emergency Scenario (PASS Suppression) */}
      <FireEmergencyScenario />

      {/* 12. Fluid Simulation: Acid Dilution Lab Station */}
      <AcidDilutionStation />

      {/* 13. Chemical Color Indicator: pH Litmus Testing Minigame */}
      <PHTestingMinigame />

      {/* 14. Real-time Physical Chemical Spill & Neutralization Simulation */}
      <ChemicalSpillSimulation />

      {/* 15. Safety Hazard Hunt & Inspection Mode */}
      <HazardHuntManager />
    </group>
  );
};
