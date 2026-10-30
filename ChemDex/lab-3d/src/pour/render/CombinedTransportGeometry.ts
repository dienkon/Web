import * as THREE from 'three';

/** Batch the active ranges of different transport topologies into one draw.
 * Child capacities stay private; stale/inactive triangles never reach the GPU. */
export class CombinedTransportGeometry extends THREE.BufferGeometry {
  private vertexCapacity = 0;
  private indexCapacity = 0;
  protected combine(geometries: readonly THREE.BufferGeometry[]) {
    const entries = geometries.filter(g => g.index && g.drawRange.count > 0).map(g => {
      const start = g.drawRange.start, count = g.drawRange.count;
      let max = -1;
      for (let i = start; i < start + count; i++) max = Math.max(max, g.index!.getX(i));
      return { g, start, count, vertices: max + 1 };
    });
    const vertices = entries.reduce((sum, e) => sum + e.vertices, 0), count = entries.reduce((sum, e) => sum + e.count, 0);
    this.setDrawRange(0, count);
    if (!count) return;
    if (vertices > this.vertexCapacity) {
      super.dispose(); this.vertexCapacity = Math.max(512, 2 ** Math.ceil(Math.log2(vertices)));
      for (const name of ['position', 'normal', 'color']) this.setAttribute(name,
        new THREE.BufferAttribute(new Float32Array(this.vertexCapacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    if (count > this.indexCapacity) {
      this.indexCapacity = Math.max(1024, 2 ** Math.ceil(Math.log2(count)));
      this.setIndex(new THREE.BufferAttribute(new Uint32Array(this.indexCapacity), 1).setUsage(THREE.DynamicDrawUsage));
    }
    const indices = this.index!.array as Uint32Array;
    let offset = 0, cursor = 0;
    for (const { g, start, count, vertices } of entries) {
      for (const name of ['position', 'normal', 'color']) (this.attributes[name].array as Float32Array)
        .set((g.attributes[name].array as Float32Array).subarray(0, vertices * 3), offset * 3);
      for (let i = start; i < start + count; i++) indices[cursor++] = offset + g.index!.getX(i);
      offset += vertices;
    }
    for (const name of ['position', 'normal', 'color']) {
      const a = this.attributes[name] as THREE.BufferAttribute;
      a.clearUpdateRanges(); a.addUpdateRange(0, vertices * 3); a.needsUpdate = true;
    }
    this.index!.clearUpdateRanges(); this.index!.addUpdateRange(0, count); this.index!.needsUpdate = true;
  }
}
