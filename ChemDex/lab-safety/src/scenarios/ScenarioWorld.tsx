import React from 'react';
import { useStore } from '../store/useStore';
import { LAB_SCENARIOS } from './catalog';
import { useScenarioSession } from './store';
import { InteractableItem } from '../components/3d/InteractableItem';
import { ScenarioProps } from './models/ScenarioProps';

export function ScenarioWorld() {
  const phase = useStore(s => s.currentPhase);
  const view = useStore(s => s.view);
  const tasks = useStore(s => s.tasks);
  if (phase !== 5 || view !== 'game') return null;
  const scenario = LAB_SCENARIOS.find(item => !tasks.find(task => task.id === item.taskId)?.completed);
  if (!scenario) return null;
  return <group name="scenario-world" key={scenario.id}>
    <InteractableItem
      id={`scenario:${scenario.id}`}
      taskId={scenario.taskId}
      position={[scenario.position[0],scenario.position[1]<.2?.026:scenario.position[1],scenario.position[2]]}
      label={`Quan sát: ${scenario.title}`}
      type="learn"
      dialogCallback={() => {
        if (!useScenarioSession.getState().begin(scenario.id)) return;
        if (useScenarioSession.getState().waitingForFilm) {
          useStore.getState().startCinematic(`scenario:${scenario.id}`);
        }
      }}
    >
      <ScenarioProps scenario={scenario} />
    </InteractableItem>
  </group>;
}
