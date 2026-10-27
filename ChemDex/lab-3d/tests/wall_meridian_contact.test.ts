import { describe,it,expect } from 'vitest';
import { wallSurfaceSection,wallHeightAtMeridian,wallDropCap } from '../src/science/wallDropletGeometry';
import { transportWallBeads,type WallBead } from '../src/engine/wallDropletTransport';
import { METERS_PER_SCENE_UNIT as scale } from '../src/science/sceneUnits';
import { WATER_CP_J_G_K as cp } from '../src/engine/waterProperties';
import type { ContourPoint } from '../src/science/vesselContours';

const cylinder: ContourPoint[]=[[1,0],[1,2]], slope: ContourPoint[]=[[1,0],[4,1]];
const mass=1e-6, contact=wallDropCap(mass).contactRadius_m/scale;
const bead=(y:number,theta=0,m=mass):WallBead=>({mass_g:m,y,theta,sliding:false});
const base={initialMass_g:mass,deposited_g:0,evaporated_g:0,dt:1/120,points:cylinder,
  bottom:0,top:2,temperature_c:25,inner:true};

describe('Piecewise meridian geometry in scene units',()=>{
  it('integrates actual segment lengths through a change of slope',()=>{
    const points:ContourPoint[]=[[0,0],[1,0],[1,1],[4,2]];
    expect(wallSurfaceSection(points,0).meridian).toBe(0);
    expect(wallSurfaceSection(points,1.5).meridian).toBeCloseTo(1+Math.sqrt(10)/2,14);
    expect(wallSurfaceSection(points,2).meridian).toBeCloseTo(1+Math.sqrt(10),14);
    const distance=wallSurfaceSection(points,1.5).meridian-wallSurfaceSection(points,0.5).meridian;
    expect(distance).toBeCloseTo(0.5+Math.sqrt(10)/2,14);
  });
  it('inverts cylinder, frustum, corners and end extensions without unit conversion',()=>{
    for(const points of [cylinder,slope,[[1,0],[1,1],[4,2]] as ContourPoint[]]){
      for(const y of [-0.1,0,0.1,0.5,1,1.5,2,2.1]){
        expect(wallHeightAtMeridian(points,wallSurfaceSection(points,y).meridian)).toBeCloseTo(y,14);
      }
    }
    expect(wallHeightAtMeridian(slope,Math.sqrt(10)/2)).toBeCloseTo(0.5,14);
  });
});

describe('Footprint contact follows the wall rather than vertical distance',()=>{
  it('does not drain a pinned cap prematurely on a steep wall',()=>{
    const previous=[bead(0.8*contact)], snapshot=JSON.stringify(previous);
    const out=transportWallBeads({...base,points:slope,previous});
    expect(out.drained_g).toBe(0);expect(out.retained_g).toBe(mass);
    expect(out.beads[0].y).toBe(previous[0].y);expect(JSON.stringify(previous)).toBe(snapshot);
  });
  it('drains real contact on the same slope with its sensible enthalpy',()=>{
    const out=transportWallBeads({...base,points:slope,previous:[bead(0.8*contact/Math.sqrt(10))]});
    expect(out.drained_g).toBe(mass);expect(out.retained_g).toBe(0);
    expect(out.drainedSensibleEnergy_J).toBeCloseTo(mass*cp*25,16);
  });
  it('places a capacity-blocked remainder tangent to the boundary along the slope',()=>{
    const out=transportWallBeads({...base,points:slope,previous:[bead(0)],maximumDrain_g:mass/2});
    const retainedContact=wallDropCap(mass/2).contactRadius_m/scale;
    expect(out.drained_g).toBeCloseTo(mass/2,16);expect(out.retained_g).toBeCloseTo(mass/2,16);
    expect(out.beads[0].y).toBeCloseTo(retainedContact/Math.sqrt(10),14);
    expect(out.beads[0].y).toBeLessThan(retainedContact);
    const next=transportWallBeads({...base,points:slope,previous:out.beads,initialMass_g:out.retained_g,maximumDrain_g:0});
    expect(next.drained_g).toBe(0);expect(next.retained_g).toBe(out.retained_g);
    expect(next.beads[0].y).toBe(out.beads[0].y);
  });
  it('keeps a geometrically exposed sloped bead eligible for finite evaporation',()=>{
    const out=transportWallBeads({...base,points:slope,previous:[bead(0.8*contact)],evaporationFlux_g_m2_s:0.1});
    expect(out.drained_g).toBe(0);expect(out.evaporated_g).toBeGreaterThan(0);
    expect(out.retained_g+out.evaporated_g).toBeCloseTo(mass,16);
  });
});

describe('End-of-substep coalescence owns its new footprint',()=>{
  it('returns a newly touching merged inner cap in the same substep',()=>{
    const previous=[bead(1.1*contact),bead(1.1*contact,1e-5)];
    const out=transportWallBeads({...base,previous,initialMass_g:2*mass});
    expect(out.drained_g).toBeCloseTo(2*mass,16);expect(out.retained_g).toBe(0);
    expect(out.drainedSensibleEnergy_J).toBeCloseTo(2*mass*cp*25,16);
    const next=transportWallBeads({...base,previous:out.beads,initialMass_g:0});
    expect(next.drained_g).toBe(0);expect(next.retained_g).toBe(0);
  });
  it('retains only the rejected merged water when admission is finite',()=>{
    const out=transportWallBeads({...base,previous:[bead(1.1*contact),bead(1.1*contact,1e-5)],
      initialMass_g:2*mass,maximumDrain_g:mass/2});
    expect(out.drained_g).toBeCloseTo(mass/2,16);expect(out.retained_g).toBeCloseTo(1.5*mass,16);
    const alive=out.beads.filter(b=>b.mass_g>0);expect(alive).toHaveLength(1);
    expect(alive[0].y).toBeCloseTo(wallDropCap(1.5*mass).contactRadius_m/scale,14);
  });
  it('sends one real merged receipt to the admission callback, without duplicate drainage',()=>{
    const receipts:number[][]=[];
    const out=transportWallBeads({...base,previous:[bead(1.1*contact),bead(1.1*contact,1e-5)],initialMass_g:2*mass,
      admitDrain:(requested,drained,sensible,temp)=>{receipts.push([requested,drained,sensible,temp]);return requested;}});
    expect(receipts).toEqual([[2*mass,0,0,25]]);
    expect(out.drained_g).toBeCloseTo(2*mass,16);
    expect(out.drainedSensibleEnergy_J).toBeCloseTo(2*mass*cp*25,16);
  });
  it('does not merge separated footprints across a sharp contour corner',()=>{
    // Midpoint metric on the lower cylindrical segment underestimates the
    // actual path, which includes the short, steep upper segment.
    const lower=0.8*contact, upper=0.2*contact;
    const points:ContourPoint[]=[[1,0],[1,1],[1+30*contact,1+contact]];
    const out=transportWallBeads({...base,points,bottom:0,top:1+contact,
      previous:[bead(1-lower),bead(1+upper)],initialMass_g:2*mass});
    expect(out.beads.filter(b=>b.mass_g>0)).toHaveLength(2);
    expect(out.retained_g).toBeCloseTo(2*mass,16);
  });
  it('conserves a mass-weighted meridian centroid when footprints overlap across a corner',()=>{
    const points:ContourPoint[]=[[1,0],[1,1],[4,2]];
    const y1=1-contact/8,y2=1+contact/8;
    const out=transportWallBeads({...base,points,previous:[bead(y1),bead(y2,0,2*mass)],initialMass_g:3*mass});
    const alive=out.beads.filter(b=>b.mass_g>0);expect(alive).toHaveLength(1);
    const arc1=1-contact/8,arc2=1+Math.sqrt(10)*contact/8;
    const expectedArc=(arc1+2*arc2)/3;
    expect(wallSurfaceSection(points,alive[0].y).meridian).toBeCloseTo(expectedArc,14);
    expect(out.retained_g).toBeCloseTo(3*mass,16);
  });
});
