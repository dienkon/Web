import { describe,it,expect } from 'vitest';
import { advanceWallDrop } from '../src/science/wallDropAdvection';
import { wallSurfaceSection,wallDropMotion,wallDropCap } from '../src/science/wallDropletGeometry';
import { transportWallBeads } from '../src/engine/wallDropletTransport';
import { METERS_PER_SCENE_UNIT as scale } from '../src/science/sceneUnits';
import type { ContourPoint } from '../src/science/vesselContours';

const vertical:ContourPoint[]=[[1,0],[1,2]];
const bent:ContourPoint[]=[[1,0],[1,1],[2,2]];
const pinning:ContourPoint[]=[[1,0],[11,1],[11,2]];
const mass=0.1,temp=25,dt=1/120;

describe('Quasi-steady wall advection splits actual travel time at corners',()=>{
  it('recovers the same straight-wall displacement',()=>{
    const motion=wallDropMotion(mass,temp,1), out=advanceWallDrop(mass,temp,vertical,1,dt);
    expect(out.y).toBeCloseTo(1-motion.speed_m_s*dt/scale,14);
    expect(out.distance_m).toBeCloseTo(motion.speed_m_s*dt,16);
    expect(out.movingTime_s).toBeCloseTo(dt,16);
  });
  it('travels the right meridian distance across a cylinder/frustum corner',()=>{
    const start=1.005;
    const upper=wallDropMotion(mass,temp,Math.sqrt(2)),lower=wallDropMotion(mass,temp,1);
    expect(upper.speed_m_s).toBe(0.15);expect(lower.speed_m_s).toBe(0.15);
    const untilCorner=(start-1)*Math.sqrt(2)*scale/upper.speed_m_s;
    const expectedY=1-lower.speed_m_s*(dt-untilCorner)/scale;
    const out=advanceWallDrop(mass,temp,bent,start,dt);
    expect(out.y).toBeCloseTo(expectedY,14);
    const actualArc=wallSurfaceSection(bent,start).meridian-wallSurfaceSection(bent,out.y).meridian;
    expect(actualArc*scale).toBeCloseTo(0.15*dt,15);
    expect(out.distance_m).toBeCloseTo(actualArc*scale,15);
  });
  it('pins exactly at a lower segment that cannot overcome retention',()=>{
    expect(wallDropMotion(mass,temp,1).speed_m_s).toBeGreaterThan(0);
    expect(wallDropMotion(mass,temp,Math.sqrt(101)).speed_m_s).toBe(0);
    const start=1.005,out=advanceWallDrop(mass,temp,pinning,start,1);
    expect(out.y).toBe(1);expect(out.speed_m_s).toBe(0);
    expect(out.distance_m).toBeCloseTo((start-1)*scale,15);
    expect(out.movingTime_s).toBeLessThan(1);
    expect(advanceWallDrop(mass,temp,pinning,out.y,1).y).toBe(1);
  });
  it('gets the same deterministic trajectory after time subdivision',()=>{
    for(const points of [bent,pinning]){
      const one=advanceWallDrop(mass,temp,points,1.005,dt);
      let y=1.005,distance=0,movingTime=0;
      for(let i=0;i<16;i++){
        const step=advanceWallDrop(mass,temp,points,y,dt/16);
        y=step.y;distance+=step.distance_m;movingTime+=step.movingTime_s;
      }
      expect(y).toBeCloseTo(one.y,13);
      expect(distance).toBeCloseTo(one.distance_m,14);
      expect(movingTime).toBeCloseTo(one.movingTime_s,14);
    }
  });
  it('does not move a pinned cap and holds a critical mobility limit',()=>{
    const pinned=advanceWallDrop(1e-6,temp,bent,1.005,10);
    expect(pinned.y).toBe(1.005);expect(pinned.distance_m).toBe(0);
    const critical=advanceWallDrop(mass,373.9,bent,1.005,10);
    expect(critical.y).toBe(1.005);expect(critical.motionLimit).toBe('critical-enhancement-unavailable');
  });
  it('stops at footprint contact instead of integrating beneath the receiver',()=>{
    const radius=wallDropCap(mass).contactRadius_m/scale;
    const out=advanceWallDrop(mass,temp,vertical,1,100,{lowerBoundaryMeridian:0});
    expect(out.y).toBeCloseTo(radius,14);
    expect(out.distance_m).toBeCloseTo((1-radius)*scale,14);
    expect(out.movingTime_s).toBeLessThan(100);
    const next=advanceWallDrop(mass,temp,vertical,out.y,100,{lowerBoundaryMeridian:0});
    expect(next.y).toBe(out.y);expect(next.distance_m).toBe(0);
  });
  it('holds invalid durations without moving the point',()=>{
    for(const duration of [-1,NaN,Infinity]){
      const out=advanceWallDrop(mass,temp,vertical,1,duration);
      expect(out.y).toBe(1);expect(out.distance_m).toBe(0);expect(out.motionLimit).toBe('invalid-advection-input');
    }
    expect(advanceWallDrop(mass,temp,vertical,1,0).y).toBe(1);
  });
  it('crosses several corners without losing elapsed motion time',()=>{
    const points:ContourPoint[]=[[1,0],[1,1],[1.002,1.002],[1.002,1.004],[1.004,1.006],[1.004,2]];
    const out=advanceWallDrop(mass,temp,points,1.007,dt);
    expect(out.y).toBeLessThan(1);
    expect(out.distance_m).toBeCloseTo(0.15*dt,14);
    expect(out.movingTime_s).toBeCloseTo(dt,14);
  });
});

it('the real bead transport cannot overshoot a pinning corner',()=>{
  const initial=[{mass_g:mass,y:1.005,theta:0,sliding:true}];
  const out=transportWallBeads({previous:initial,initialMass_g:mass,deposited_g:0,evaporated_g:0,
    dt,points:pinning,bottom:0,top:2,temperature_c:temp,inner:false});
  expect(out.beads[0].y).toBe(1);expect(out.beads[0].sliding).toBe(false);
  expect(out.retained_g).toBe(mass);expect(out.drained_g).toBe(0);
  expect(initial[0].y).toBe(1.005);
});
