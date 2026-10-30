import { afterEach,describe,it,expect,vi } from 'vitest';
import { suspensionFluidProperties } from '../src/science/suspensionFluid';
import { PrecipitationSystem,type PrecipitationSimulationParams } from '../src/simulation/effects/PrecipitationSystem';
import { LiquidMotionSystem } from '../src/simulation/effects/LiquidMotionSystem';
import { PRNG } from '../src/core/rng';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import { useAppStore } from '../src/store/useAppStore';
import { effects } from '../src/vfx/vesselEffects';
import type { SubstanceContent,VesselState } from '../src/types/chemistry';

const before=useAppStore.getState();
afterEach(()=>{vi.restoreAllMocks();useAppStore.setState(before,true);SimulationEngine.clearAll();});
const water:SubstanceContent={formula:'H2O',phase:'l',mass_g:100,moles:100/18.015};
const solid:SubstanceContent={formula:'CuS',phase:'s',mass_g:0.1,moles:0.1/95.61,solidOrigin:'precipitate'};
const params:PrecipitationSimulationParams={temp_c:25,ambientTemp_c:25,viscosity_mPa_s:1,density_g_ml:1,
  radius:1,liquidBottomY:0,surfaceY:3,precipitateAmount_g:0.1,volume_ml:100,substance:'CuS'};
const create=()=>new PrecipitationSystem(20,'CuS',new PRNG(47));

describe('Carrier identity follows bulk liquid/ice inventory',()=>{
  it('distinguishes liquid, dry solids, frozen matrix and slush',()=>{
    expect(suspensionFluidProperties([water,solid],100,25).carrierMode).toBe('liquid');
    expect(suspensionFluidProperties([solid],0,200).carrierMode).toBe('dry-residue');
    expect(suspensionFluidProperties([{...water,phase:'s'},solid],0,-5).carrierMode).toBe('frozen-matrix');
    expect(suspensionFluidProperties([{...water,phase:'s'},water,solid],100,0).carrierMode).toBe('liquid');
  });
  it('does not treat gas or filter-held liquid as a bulk suspension carrier',()=>{
    const result=suspensionFluidProperties([{...water,phase:'g'},{...water,location:'filter'},solid],100,25);
    expect(result.carrierMode).toBe('dry-residue');expect(result.liquidMass_g).toBe(0);
  });
  it('labels an unknown-phase legacy liquid as a proxy instead of falsely declaring dry residue',()=>{
    const result=suspensionFluidProperties([{...water,phase:undefined},solid],100,25);
    expect(result.carrierMode).toBe('liquid');expect(result.carrierModel).toBe('unknown-phase-liquid-proxy');
  });
});

describe('A missing carrier cannot apply liquid Brownian/drag/entrainment',()=>{
  it('projects a dry bulk residue to its bed without changing declared mass or clock',()=>{
    const system=create();system.update(0.8,params);
    expect(system.particles.length).toBeGreaterThan(0);
    const flow=vi.spyOn(LiquidMotionSystem,'sampleVelocity');
    system.update(0.8,{...params,temp_c:200,volume_ml:0,carrierMode:'dry-residue',agitation:1,heatPower_W:300});
    expect(flow).not.toHaveBeenCalled();expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.amount_g).toBe(0.1);expect(system.sedimentBed.thickness).toBeGreaterThan(0);
    expect(system.representedMass_g).toBe(0.1);expect(system.cloudiness).toBe(0);
    expect(system.sedimentBed.resuspensionTurbidity).toBe(0);
    expect(system.integratedTime_s).toBeCloseTo(1.6,12);expect(system.pendingTime_s).toBe(0);
  });
  it('uses an explicit zero liquid volume in standalone calls as dry residue',()=>{
    const system=create();system.update(0.8,{...params,volume_ml:0,agitation:1});
    expect(system.carrierMode).toBe('dry-residue');expect(system.emittedCount).toBe(0);
    expect(system.representedMass_g).toBe(0.1);expect(system.sedimentBed.amount_g).toBe(0.1);
  });
  it('does not spontaneously resuspend a dry bed when liquid returns without agitation',()=>{
    const system=create();system.update(0.1,{...params,volume_ml:0});system.update(0.1,params);
    expect(system.carrierMode).toBe('liquid');expect(system.particles).toHaveLength(0);
    expect(system.sedimentBed.amount_g).toBe(0.1);expect(system.cloudiness).toBe(0);
    system.update(0.2,{...params,agitation:1});
    expect(system.particles.length).toBeGreaterThan(0);expect(system.sedimentBed.amount_g).toBeLessThan(0.1);
    expect(system.representedMass_g).toBeCloseTo(0.1,13);expect(system.cloudiness).toBeGreaterThan(0);
  });
  it('holds particles in a fully frozen matrix and resumes the carrier only after thaw',()=>{
    const system=create();system.update(0.8,params);
    const points=system.particles.map(p=>({x:p.x,y:p.y,z:p.z,age:p.age})),bed=system.sedimentBed.amount_g;
    const flow=vi.spyOn(LiquidMotionSystem,'sampleVelocity');
    system.update(0.8,{...params,volume_ml:0,carrierMode:'frozen-matrix',temp_c:-5,agitation:1});
    expect(flow).not.toHaveBeenCalled();expect(system.particles).toHaveLength(points.length);
    system.particles.forEach((p,i)=>{
      expect([p.x,p.y,p.z]).toEqual([points[i].x,points[i].y,points[i].z]);
      expect([p.vx,p.vy,p.vz]).toEqual([0,0,0]);expect(p.age).toBeCloseTo(points[i].age+0.8,12);
    });
    expect(system.sedimentBed.amount_g).toBe(bed);expect(system.cloudiness).toBe(0);
    expect(system.representedMass_g).toBeCloseTo(0.1,13);
    system.update(0.1,{...params,carrierMode:'liquid'});
    expect(flow.mock.calls.length).toBeGreaterThan(0);expect(system.carrierMode).toBe('liquid');
    expect(system.particles.map(p=>[p.x,p.y,p.z])).not.toEqual(points.map(p=>[p.x,p.y,p.z]));
    expect(system.representedMass_g).toBeCloseTo(0.1,13);
  });
  it('keeps newly declared solid in a frozen reservoir without inventing liquid nucleation',()=>{
    const system=create();system.update(0.8,params);const count=system.emittedCount;
    system.update(0.8,{...params,carrierMode:'frozen-matrix',volume_ml:0,precipitateAmount_g:0.12});
    expect(system.emittedCount).toBe(count);expect(system.representedMass_g).toBeCloseTo(0.12,13);
    expect(system.sedimentBed.amount_g).toBe(0);expect(system.cloudiness).toBe(0);
  });
});

it('the addressed manager/inspect exposes a dry carrier and preserves the vessel inventory',()=>{
  const vessel={id:'dry-carrier',type:'beaker',capacity_ml:100,volume_ml:0,mass_g:0.1,temperature_c:200,
    contents:[solid],position:[0,0,0],precipitateSubstance:'CuS',hasPrecipitate:true} as VesselState;
  useAppStore.setState({vessels:{[vessel.id]:vessel},vesselIds:[vessel.id]});
  const original=JSON.stringify(vessel),manager=SimulationEngine.getManager(vessel.id);
  manager.step(vessel,0.8,{thermalStateAuthoritative:true,agitation:1});
  expect(manager.precipitationSystem.carrierMode).toBe('dry-residue');
  expect(manager.sedimentBed.amount_g).toBe(0.1);expect(manager.cloudiness).toBe(0);
  const state=effects.forVessel(vessel.id).inspect().state!;
  expect(state.suspensionCarrier).toMatchObject({mode:'dry-residue',model:'dry-bulk-bed-projection',liquidMass_g:0});
  expect(state.precipitationTiming[0].carrierMode).toBe('dry-residue');
  expect(JSON.stringify(vessel)).toBe(original);expect(useAppStore.getState().vesselIds).toEqual(['dry-carrier']);
});

it.each(['dry-residue','frozen-matrix'] as const)('does not retain/create underwater bubbles without a liquid carrier: %s',mode=>{
  const manager=SimulationEngine.getManager('carrier-bubbles');
  const liquid={id:'carrier-bubbles',type:'beaker',capacity_ml:250,volume_ml:100,mass_g:100,
    contents:[water],temperature_c:25,position:[0,0,0]} as VesselState;
  manager.step(liquid,0.1,{thermalStateAuthoritative:true,reactionGasRate:120});
  expect(manager.boilingSystem.bubbles.length).toBeGreaterThan(0);
  // Some legacy snapshots retain an occupied/display volume after losing
  // their liquid. Known phase inventory must take priority over that number.
  const contents:SubstanceContent[]=mode==='frozen-matrix'?[{...water,phase:'s'},solid]
    :[{formula:'CO2',phase:'g',mass_g:1,moles:1/44.01},solid];
  const vessel={...liquid,contents,temperature_c:mode==='frozen-matrix'?-5:25};
  const original=JSON.stringify(vessel);
  manager.step(vessel,0.1,{thermalStateAuthoritative:true,reactionGasRate:120});
  expect(manager.boilingSystem.bubbles).toHaveLength(0);
  expect(manager.precipitationSystem.carrierMode).toBe(mode);
  expect(JSON.stringify(vessel)).toBe(original);
});
