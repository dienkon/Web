// Development-only controlled renderer remount, without a second room clock.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { GasClouds } from '../../src/vfx/particles/GasPlume';
import { useAppStore } from '../../src/store/useAppStore';
import { roomGasClouds } from '../../src/simulation/effects/GasCloudRepository';
const root = createRoot(document.getElementById('root')!);
useAppStore.setState({ isSimulationPaused: true });
roomGasClouds.syncEpoch(useAppStore.getState().pourEpoch);
let generation = 0;
function mount() {
  root.render(<div style={{ width: '100vw', height: '100vh', background: '#cbd5e1' }}>
    <Canvas key={++generation} camera={{ position: [0, 2, 6] }}><GasClouds /></Canvas>
  </div>);
}
Object.assign(window, { gasFixture: { mount, unmount: () => root.render(null), room: roomGasClouds,
  seed: () => { roomGasClouds.clear(); roomGasClouds.advance(0.8, [{ vesselId: 'controlled-optical-source', revision: 1,
    receipt: {}, seconds: 0.8, species: 'NO2', input: { rate: 40, mol_s: 0.001, temperature_c: 25, ambient_c: 25,
      molarMass: 46.005, mouthY: 1, mouthRadius: 0.3, floorY: -1.175, wind_m_s: 0.1 } }]); },
  snapshot: () => JSON.stringify([...roomGasClouds.clouds.values()]) }, gasFixtureReady: true });
mount();
