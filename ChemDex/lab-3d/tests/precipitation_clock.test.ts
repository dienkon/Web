import { afterEach,describe,it,expect,vi } from 'vitest';
import { PrecipitationSystem,type PrecipitationSimulationParams } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { LiquidMotionSystem } from '../src/simulation/effects/LiquidMotionSystem';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import type { VesselState } from '../src/types/chemistry';

const original=useAppStore.getState();
afterEach(()=>{vi.restoreAllMocks();useAppStore.setState(original,true);SimulationEngine.clearAll();});
const params:PrecipitationSimulationParams={temp_c:25,ambientTemp_c:25,viscosity_mPa_s:1,density_g_ml:1,
  radius:1,liquidBottomY:0,surfaceY:4,precipitateAmount_g:0.1,volume_ml:100,substance:'CuS',agitation:0.4};
const make=(count=20)=>new PrecipitationSystem(count,'CuS',new PRNG(73));
function close(a:PrecipitationSystem,b:PrecipitationSystem){
  expect(a.emittedCount).toBe(b.emittedCount);expect(a.particles.length).toBe(b.particles.length);
  expect(a.representedMass_g).toBeCloseTo(b.representedMass_g,12);
  expect(a.sedimentBed.amount_g).toBeCloseTo(b.sedimentBed.amount_g,12);
  for(let i=0;i<a.particles.length;i++){
    for(const key of ['x','y','z','vx','vy','vz','age','mass_ug'] as const) expect(a.particles[i][key]).toBeCloseTo(b.particles[i][key],9);
  }
}

describe('Precipitation retains accepted physical time',()=>{
  it('integrates a normal0.8s scaled frame completely instead of truncating to0.2s',()=>{
    const one=make(),reference=make();one.update(0.8,params);
    for(let i=0;i<96;i++)reference.update(1/120,params);
    expect(one.clock).toMatchObject({acceptedTime_s:0.8,pendingTime_s:0});
    expect(one.integratedTime_s).toBeCloseTo(0.8,12);close(one,reference);
  });
  it('produces the same seeded trajectories at10/30/60/120FPS and8x',()=>{
    const reference=make();for(let i=0;i<1920;i++)reference.update(1/120,params);
    for(const hz of [10,30,60,120]){
      const system=make();for(let i=0;i<hz*2;i++)system.update(8/hz,params);
      expect(system.acceptedTime_s).toBeCloseTo(16,10);expect(system.integratedTime_s).toBeCloseTo(16,10);
      expect(system.pendingTime_s).toBe(0);close(system,reference);
    }
  });
  it('bounds work per call and keeps exceptional backlog until explicitly processed',()=>{
    const system=make();system.update(4,params);
    expect(system.acceptedTime_s).toBe(4);expect(system.integratedTime_s).toBeCloseTo(2,12);
    expect(system.pendingTime_s).toBeCloseTo(2,12);
    const frozen=JSON.stringify({clock:system.clock,particles:system.particles});
    for(const dt of [0,-1,NaN,Infinity])system.update(dt,params);
    expect(JSON.stringify({clock:system.clock,particles:system.particles})).toBe(frozen);
    system.update(0.001,params);
    expect(system.integratedTime_s).toBeCloseTo(4,12);expect(system.pendingTime_s).toBeCloseTo(0.001,12);
    system.update(0.001,params);
    expect(system.pendingTime_s).toBe(0);expect(system.integratedTime_s).toBeCloseTo(4.002,12);
  });
  it('keeps old source/environment/entry snapshots ahead of new conditions in the queue',()=>{
    const system=make(0),old={...params,entryPoint:[0.2,2,0.1] as [number,number,number]};
    system.update(4,old);old.temp_c=80;old.entryPoint.fill(NaN);
    system.setParticleBudget(20);
    const flow=vi.spyOn(LiquidMotionSystem,'sampleVelocity');
    system.update(0.001,{...params,temp_c:40,entryPoint:[0.4,3,0.3]});
    expect(flow.mock.calls.length).toBeGreaterThan(0);
    expect(flow.mock.calls.every(call=>call[3].temp_c===25)).toBe(true);
    expect(system.particles.length).toBeGreaterThan(0);
    expect(system.particles.every(p=>[p.x,p.y,p.z].every(Number.isFinite))).toBe(true);
    flow.mockClear();system.update(0.001,{...params,temp_c:50});
    expect(flow.mock.calls.map(call=>call[3].temp_c)).toContain(40);
    expect(flow.mock.calls.map(call=>call[3].temp_c)).toContain(50);
    expect(system.pendingTime_s).toBe(0);
  });
  it('applies a finite suspension withdrawal once, not once per substep',()=>{
    const system=make();system.update(1,params);
    expect(system.particles).toHaveLength(20);
    system.update(0.8,{...params,precipitateAmount_g:0.08,withdrawnSuspension_g:0.02});
    expect(system.emittedCount).toBe(20);expect(system.representedMass_g).toBeCloseTo(0.08,13);
    expect(system.particles.reduce((s,p)=>s+p.mass_ug/1e6,0)).toBeCloseTo(0.08,13);
  });
  it('counts elapsed time through a zero-mass interval without resetting its clock',()=>{
    const system=make();system.update(0.8,{...params,precipitateAmount_g:0});
    expect(system.acceptedTime_s).toBe(0.8);expect(system.integratedTime_s).toBeCloseTo(0.8,12);
    expect(system.lastInputMass_g).toBe(0);expect(system.pendingTime_s).toBe(0);
    system.update(0.1,params);expect(system.acceptedTime_s).toBeCloseTo(0.9,12);
    expect(system.representedMass_g).toBeCloseTo(0.1,13);
  });
  it('clears backlog and seeded particle history only on an explicit reset',()=>{
    const system=make();system.update(4,params);system.reset();
    expect(system.clock).toMatchObject({acceptedTime_s:0,integratedTime_s:0,pendingTime_s:0});
    system.update(0.1,params);const fresh=make();fresh.update(0.1,params);close(system,fresh);
  });
  it('rejects invalid physical packets without advancing time or consuming old queued work',()=>{
    const system=make();system.update(4,params);const before=JSON.stringify({clock:system.clock,p:system.particles});
    for(const patch of [{temp_c:NaN},{viscosity_mPa_s:0},{density_g_ml:-1},{precipitateAmount_g:-1},
      {withdrawnSuspension_g:-1},{agitation:2},{entryPoint:[NaN,0,0] as [number,number,number]}])system.update(0.1,{...params,...patch});
    expect(JSON.stringify({clock:system.clock,p:system.particles})).toBe(before);
  });
  it('exposes clocks by vessel/species without creating managers from inspect',()=>{
    const vessel={id:'precip-clock',type:'beaker',capacity_ml:250,temperature_c:25,volume_ml:100,mass_g:100.1,
      contents:[{formula:'H2O',phase:'l',mass_g:100,moles:100/18.015},
        {formula:'CuS',phase:'s',mass_g:0.1,moles:0.1/95.61,solidOrigin:'precipitate'}]} as VesselState;
    useAppStore.setState({vessels:{[vessel.id]:vessel},vesselIds:[vessel.id]});
    expect(effects.forVessel(vessel.id).inspect().state?.precipitationTiming).toEqual([]);
    expect(SimulationEngine.findManager(vessel.id)).toBeUndefined();
    const manager=SimulationEngine.getManager(vessel.id);manager.step(vessel,0.8,{thermalStateAuthoritative:true});
    const snapshot=JSON.stringify(useAppStore.getState().vessels),timing=effects.forVessel(vessel.id).inspect().state!.precipitationTiming;
    expect(timing).toHaveLength(1);expect(timing[0].formula).toBe('CuS');
    expect(timing[0].integratedTime_s).toBeCloseTo(0.8,12);expect(timing[0].pendingTime_s).toBe(0);
    expect(JSON.stringify(useAppStore.getState().vessels)).toBe(snapshot);
  });
});
