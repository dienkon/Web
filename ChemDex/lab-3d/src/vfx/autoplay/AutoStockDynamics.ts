import { Quaternion, Vector3 } from 'three';
import type { VesselState } from '../../types/chemistry';
import { isSuspensionRow } from '../../science/precipitateInventory';
import type { VortexSurface } from '../../science/liquidVortex';
import type { StockWorld } from '../../physical/StockWorld';
import { stockContainer } from '../../physical/stockAdapter';
import { createStockSolidLayout } from '../../components/three/stockSolidLayout';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { vesselLocalToWorld } from '../../science/vesselScale';
import { scenePointToSI } from '../../science/sceneUnits';
import type { StockContactBirth, StockContactReceipt, StockGrainPose, StockGroupInput } from '../../physical/stockTypes';
import type { Quat } from '../../physical/types';
import { autoSolid } from './autoSolid';

/** Isolated instance of the manual bench's SI rigid-contact, buoyancy and drag
 * solver. The finite chemical inventory owns mass; poses never create matter. */
export class AutoStockDynamics {
  grains: StockGrainPose[] = [];
  private world?: StockWorld;
  private loading?: Promise<void>;
  private generation = 0;
  private sequence = 0;
  private contacts: StockContactReceipt[] = [];
  private groups = new Map<string, StockGroupInput>();

  initialize(): Promise<void> {
    if (!this.loading) {
      const generation = this.generation;
      this.loading = import('../../physical/StockWorld').then(({ StockWorld }) => StockWorld.create()).then(world => {
        if (generation !== this.generation) world.free(); else this.world = world;
      }).catch(error => { if (generation === this.generation) this.loading = undefined; throw error; });
    }
    return this.loading;
  }
  addContact(vesselId: string, formula: string, pieces: StockContactBirth[]) {
    if (pieces.length) this.contacts.push({ id: ++this.sequence, vesselId, formula, pieces, resolved: true });
  }
  advance(vessel: VesselState, dt: number, vortex?: VortexSurface) {
    if (!this.world || !(dt > 0) || !Number.isFinite(dt)) return;
    const masses = new Map<string, number>();
    for (const row of vessel.contents) if (row.phase === 's' && row.mass_g > 1e-10
      && (!row.location || row.location === 'bulk') && row.solidOrigin !== 'precipitate'
      && !(vessel.volume_ml > 0.05 && isSuspensionRow(row, vessel.contents, vessel.precipitateSubstance))) {
      masses.set(row.formula, (masses.get(row.formula) ?? 0) + row.mass_g);
    }
    // Empty vessels and suspended reaction products have no rigid stock to step.
    if (!masses.size && !this.grains.length) { this.contacts = []; return; }
    const container = stockContainer(vessel, false, vortex, false);
    if (!container) return;
    for (const [formula, mass_g] of masses) {
      let group = this.groups.get(formula);
      if (!group) {
        const solid = autoSolid(formula), p = new Vector3(), q = new Quaternion(), scale = new Vector3();
        const layout = createStockSolidLayout(vessel.type, solid.morphology, solid.geometry,
          solidSceneVolume(vessel, mass_g / solid.density), undefined, undefined, true, solid.fixedCount);
        group = { formula, mass_g, density_kg_m3: solid.density * 1000, powder: solid.morphology === 'POWDER', unitVolume: 1,
          vertices: Array.from(solid.geometry.getAttribute('position').array), seed: layout.pieces.map(piece => {
            piece.matrix.decompose(p, q, scale);
            return { position_m: scenePointToSI(vesselLocalToWorld(vessel, p.toArray())), rotation: q.toArray() as Quat };
          }) };
        this.groups.set(formula, group);
      }
      container.groups.push({ ...group, mass_g });
    }
    this.world.sync({ containers: [container], contacts: this.contacts, spills: [] });
    this.contacts = [];
    const snapshot = this.world.advance(dt, false);
    this.grains = snapshot.grains.filter(g => g.vesselId === vessel.id).map(g => g.pose);
    vessel.stockMotion = { tick: snapshot.tick, grains: this.grains };
  }
  dispose() {
    this.generation++; this.world?.free(); this.world = undefined; this.loading = undefined;
    this.contacts = []; this.groups.clear(); this.grains = [];
  }
}
