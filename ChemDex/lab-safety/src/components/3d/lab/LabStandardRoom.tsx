import { ScenarioWorld } from '../../../scenarios/ScenarioWorld';
import { LabEquipmentController, handleLabItemClick } from './LabEquipmentController';
import React from 'react';
import { useStore } from '../../../store/useStore';
import { LooseWaste } from './LooseWaste';
import { PlayerMirror } from './PlayerMirror';
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
import { HazardHuntManager } from './HazardHuntManager';
import { EmergencyShowerStation } from './EmergencyShowerStation';
import { InteractiveFumeHood } from './InteractiveFumeHood';
import { FirstAidTreatmentStation } from './FirstAidTreatmentStation';
import { ChemicalSpillSimulation } from './ChemicalSpillSimulation';
import { BunsenBurnerStation } from './BunsenBurnerStation';
import { AdvancedSafetyRounds } from './AdvancedSafetyRounds';
import { ApparatusDetails } from './ApparatusDetails';
import {StaticRoomBatch} from './StaticRoomBatch';

export const LabStandardRoom: React.FC = () => {
  const scenarioPhase = useStore(s => s.currentPhase === 5);
  return (
    <group name="lab-room" onClick={handleLabItemClick}>
      {/* 1. Core Architecture (Walls, floor, ceiling, doors A & B) */}
      <StaticRoomBatch id="architecture"><LabBaseRoom /></StaticRoomBatch>
      <LabEquipmentController />

      {/* 2. Entrance & Preparation (PPE Station, Handwash Sink) */}
      <PPEStation />
      <PlayerMirror />
      <HandwashSink />

      {/* 3. West Wall (Emergency Safety Wall + Interactive Shower & First Aid) */}
      <SafetyWall />
      <EmergencyShowerStation />
      <FirstAidTreatmentStation />

      {/* 4. Island Benches (4 benches with Bunsen Burner & Lab Equipment) */}
      <StaticRoomBatch id="benches" key={scenarioPhase?'scenario':'ordinary'}><IslandBenches /></StaticRoomBatch>
      {!scenarioPhase && <ApparatusDetails />}
      {!scenarioPhase && <BunsenBurnerStation />}

      {/* 5. Northeast Fume Hood (Base Shell + Interactive Sliding Sash & Vapors) */}
      <FumeHood />
      <InteractiveFumeHood />

      {/* 6. East Wall (Chemical Storage Cabinets & GHS Incompatibility Sorter) */}
      <StorageCabinets />

      {/* 7. Southeast Waste Segregation Station */}
      <WasteStation />
      <LooseWaste />
      <AdvancedSafetyRounds />
      <ScenarioWorld />

      {/* 8. North Teaching Wall & Ambient Decor */}
      <StaticRoomBatch id="decor"><LabDecor /></StaticRoomBatch>

      {/* 9. Interactive Task Collider Triggers & Prompt Logic */}
      <InteractiveTasks />

      {/* 10. 3D Animated Navigation Arrow & Sonar Waypoint */}
      <ObjectiveMarker />

      {/* 11. Real-time Physical Fire Emergency Scenario (PASS Suppression) */}
      <FireEmergencyScenario />

      {/* 12. Fluid Simulation: Acid Dilution Lab Station */}
      {!scenarioPhase && <AcidDilutionStation />}

      {/* 13. Chemical Color Indicator: pH Litmus Testing Minigame */}

      {/* 14. Real-time Physical Chemical Spill & Neutralization Simulation */}
      <ChemicalSpillSimulation />

      {/* 15. Safety Hazard Hunt & Inspection Mode */}
      <HazardHuntManager />
    </group>
  );
};
