import { describe,expect,it } from 'vitest';
import { waterBackgroundViscosity_Pa_s as mu, waterViscosityNeedsCriticalEnhancement } from '../src/science/waterViscosity';
import { liquidWaterViscosity_Pa_s } from '../src/science/liquidTransport';
import { wallDropMotion } from '../src/science/wallDropletGeometry';
import { transportWallBeads } from '../src/engine/wallDropletTransport';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { waterSaturationProperties } from '../src/science/waterThermodynamics';
import { vesselInterior } from '../src/science/vesselDimensions';
import type { VesselState } from '../src/types/chemistry';

describe('IAPWS R12-08 background viscosity, mu2=1',()=>{
  // Independent program verification values, Table4 of the release.
  it.each([
    [298.15,998,889.735100],[298.15,1200,1437.649467],[373.15,1000,307.883622],
    [433.15,1,14.538324],[433.15,1000,217.685358],[873.15,1,32.619287],
    [873.15,100,35.802262],[873.15,600,77.430195],[1173.15,1,44.217245],
    [1173.15,100,47.640433],[1173.15,400,64.154608],
  ])('matches the published point at %sK and %s kg/m3',(t,rho,microPa)=>{
    expect(mu(t,rho)!*1e6).toBeCloseTo(microPa,6);
  });
  it('has a finite dilute-gas limit and rejects invalid input',()=>{
    expect(mu(300,0)).toBeGreaterThan(0);
    for(const [t,rho] of [[0,1000],[-1,1000],[NaN,1000],[300,-1],[300,Infinity]]) expect(mu(t,rho)).toBeNull();
  });
  it('marks the critical enhancement region explicitly',()=>{
    expect(waterViscosityNeedsCriticalEnhancement(647.096,322)).toBe(true);
    expect(waterViscosityNeedsCriticalEnhancement(600,322)).toBe(false);
    expect(waterViscosityNeedsCriticalEnhancement(647.096,500)).toBe(false);
  });
});

describe('Water-bead mobility uses a named viscosity reference',()=>{
  it('agrees with the independent low-temperature reference within its accuracy',()=>{
    for(const temp of [0,25,60,100,110]){
      const result=wallDropMotion(0.1,temp,1);
      expect(result.motionLimit).toBeUndefined();
      expect(result.viscosityModel).toBe('iapws2008-saturation-reference');
      expect(Math.abs(result.viscosity_Pa_s!/liquidWaterViscosity_Pa_s(temp)!-1)).toBeLessThan(0.01);
    }
  });
  it('uses the full correlation above110C without extending the SR6 shortcut',()=>{
    const temp=200, result=wallDropMotion(0.1,temp,1);
    expect(liquidWaterViscosity_Pa_s(temp)).toBeNull();
    expect(result.motionLimit).toBeUndefined();
    expect(result.viscosity_Pa_s).toBe(mu(temp+273.15,waterSaturationProperties(temp)!.liquidDensity_kg_m3));
    expect(result.speed_m_s).toBeGreaterThan(0);
  });
  it('balances gravity, retention and drag below the nominal speed cap',()=>{
    // Find a mobile drop that does not hit the existing presentation cap.
    let result=wallDropMotion(0.00001,25,1);
    for(let mass=0.00001;mass<=0.1;mass*=1.02){
      result=wallDropMotion(mass,25,1);
      if(result.speed_m_s>0 && result.speed_m_s<0.14) break;
    }
    expect(result.speed_m_s).toBeGreaterThan(0);expect(result.speed_m_s).toBeLessThan(0.14);
    const drag=6*Math.PI*result.viscosity_Pa_s!*result.radius_m*20;
    expect(drag*result.speed_m_s+result.retention_N).toBeCloseTo(result.drive_N,14);
    expect(wallDropMotion(0.1,25,2).drive_N).toBeCloseTo(0.1*0.001*9.80665/2,14);
  });
  it('holds unsupported/invalid/critical mobility without fabricating a speed',()=>{
    for(const [mass,temp,metric] of [[0.1,-1,1],[0.1,373.946,1],[0.1,25,0],[NaN,25,1],[0.1,25,NaN]]){
      const result=wallDropMotion(mass,temp,metric);
      expect(result.speed_m_s).toBe(0);expect(result.motionLimit).toBeDefined();
    }
    const critical=wallDropMotion(0.1,373.9,1);
    expect(critical.motionLimit).toBe('critical-enhancement-unavailable');expect(critical.speed_m_s).toBe(0);
    expect(wallDropMotion(0.1,25,1).motionLimit).toBeUndefined(); // cache does not leak the critical limit
  });
  it('retains finite beads and reports a mobility limit through transport',()=>{
    const points=vesselInterior('beaker').points;
    const result=transportWallBeads({ previous:[{mass_g:0.01,y:0.5,theta:0,sliding:false}],initialMass_g:0.01,
      deposited_g:0,evaporated_g:0,dt:1/60,points,bottom:-0.9,top:0.9,temperature_c:373.9,inner:false });
    expect(result.motionModelLimit).toBe('critical-enhancement-unavailable');
    expect(result.retained_g).toBe(0.01);expect(result.drained_g).toBe(0);
    expect(result.beads[0].y).toBe(0.5);expect(result.beads[0].mass_g).toBe(0.01);
  });
  it('propagates the named motion model into wall state on the existing vessel',()=>{
    const vessel={id:'wall-mu',type:'beaker',capacity_ml:100,volume_ml:50,mass_g:50,temperature_c:5,
      contents:[{formula:'H2O',phase:'l',mass_g:50,moles:50/18.015}]} as VesselState;
    const result=stepWallCondensation(vessel,0.01,0);
    expect(result.wall.motionModel).toBe('quasi-steady-cap/iapws2008-saturation-reference');
    expect(result.wall.outerMotionLimit).toBeUndefined();
    expect(vessel.wallCondensation).toBeUndefined();
  });
});
