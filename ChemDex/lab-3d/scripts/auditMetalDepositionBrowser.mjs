import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const output = process.env.METAL_DEPOSITION_OUTPUT ?? 'artifacts/metal-deposition';
const origin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.routeWebSocket('**/*', ws => ws.close());
await context.addInitScript(() => { localStorage.setItem('chemlab_vfx_quality_preference', 'low'); performance.setResourceTimingBufferSize(5000); });
await context.route('**/api/**', route => route.abort());
const page = await context.newPage(), report = { errors: [], consoleErrors: [], checks: [] };
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.consoleErrors.push(message.text()); });
page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
        const resource = s => performance.getEntriesByType('resource').map(r => r.name).find(n => n.includes(s));
        const { useAppStore: app } = await import(resource('/src/store/useAppStore.ts'));
        const { _roots } = await import(resource('/@react-three_fiber.js'));
        const root = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store;
        const { computeMolarMass: mm } = await import(resource('/src/engine/ledger.ts'));
        const { solidSceneVolume } = await import(resource('/src/science/vesselDimensions.ts'));
        const { vesselLocalToWorld } = await import(resource('/src/science/vesselScale.ts'));
        const { createStockSolidLayout } = await import(resource('/src/science/stockSolidLayout.ts'));
        const { createStockSolidGeometry } = await import(resource('/src/science/stockSolidGeometry.ts'));
        const { appendMetalDeposit } = await import(resource('/src/science/metalDeposition.ts'));
        const { SimulationEngine } = await import(resource('/src/simulation/core/SimulationEngine.ts'));
        const { freePrecipitateCohorts } = await import(resource('/src/science/freePrecipitateCohorts.ts'));
        const { currentMixedPrecipitateTurbidity } = await import(resource('/src/simulation/render/precipitateTurbidity.ts'));
        const { getSolidMorphology, findChemical } = await import(resource('/src/data/chemicals.ts'));
        const three = await import(resource('/three.js'));
        const vessels = {};
        for (const [i, [formula, product, route]] of [['Fe (nail)', 'Cu', 'fe_cuso4'], ['Cu (turnings)', 'Ag', 'cu_agno3']].entries()) {
            const v = { id: `coat-${i}`, name: 'Surface deposit', type: 'beaker', capacity_ml: 100, position: [i ? 2 : -2, 0, 1], rotationY: 0, isLocked: false, temperature_c: 25, ph: 7, volume_ml: 60, volume: .6, mass_g: 61, hasGas: false, hasPrecipitate: true, isBoiling: false, liquidColor: '#f8fafc', substances: ['H2O', formula, product], contents: [{ formula: 'H2O', phase: 'l', mass_g: 60, moles: 60 / mm('H2O') }, { formula, phase: 's', mass_g: 1, moles: 1 / mm(formula) }] };
            const density = findChemical(formula).density, g = createStockSolidGeometry(getSolidMorphology(formula), formula), layout = createStockSolidLayout(v.type, getSolidMorphology(formula), g, solidSceneVolume(v, 1 / density));
            const pos = new three.Vector3(), q = new three.Quaternion(), scale = new three.Vector3();
            v.stockMotion = { tick: 1, grains: layout.pieces.map((piece, j) => { piece.matrix.decompose(pos, q, scale); return { id: `carrier-${i}-${j}`, formula, mass_g: 1 / layout.pieces.length, scale_m: scale.x * Math.cbrt((1 / density * 1e-6) / solidSceneVolume(v, 1 / density)), position_m: vesselLocalToWorld(v, pos.toArray()).map(n => n * .035), rotation: q.toArray(), velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false, contacting: true }; }) };
            appendMetalDeposit(v.contents, { formula: product, phase: 's', solidOrigin: 'precipitate', mass_g: .1, moles: .1 / mm(product) }, route, v);
            v.mass_g = 61.1;
            v.lastReactionId = 'hcl_naoh';
            vessels[v.id] = v;
            g.dispose();
        }
        const source = vessels['coat-0'], p = { ...source.stockMotion.grains[0], id: 'escaped-coat', vesselId: source.id,
            position_m: [0, .04, .12], rotation: new three.Quaternion().setFromEuler(new three.Euler(1.4, .2, .3)).toArray() },
            contents = [{ ...source.contents[1], mass_g: p.mass_g, moles: p.mass_g / mm(p.formula) }, { formula: 'Cu', phase: 's', solidOrigin: 'precipitate', depositSubstrate: 'Fe', depositionReactionId: 'fe_cuso4', depositCarrierId: p.id, mass_g: .05, moles: .05 / mm('Cu') }];
        const { StockWorld } = await import(resource('/src/physical/StockWorld.ts') ?? '/src/physical/StockWorld.ts');
        const { stockGroup, stockCarrierCoatings } = await import(resource('/src/physical/stockAdapter.ts') ?? '/src/physical/stockAdapter.ts');
        const group = stockGroup(p.formula, p.mass_g), settledWorld = await StockWorld.create();
        group.carrierCoatings = stockCarrierCoatings({ ...source, contents, stockMotion: { tick: 0, grains: [p] } }, p.formula);
        try {
            settledWorld.sync({ containers: [], contacts: [], spills: [{ ...p, group }] });
            for (let i = 0; i < 240; i++) settledWorld.advance(1 / 120, false);
            Object.assign(p, settledWorld.snapshot().grains.find(grain => grain.pose.id === p.id).pose);
        } finally { settledWorld.free(); }
        if (!p.contacting || Math.hypot(...p.velocity_m_s) > .005) throw Error('Escaped coated fixture must rest on the real table');
        const spill = { id: 'coated-spill', position: p.position_m.map(n => n / .035), contents, substances: [p.formula, 'Cu'], mass_g: p.mass_g + .05, volume_ml: 0, radius: .1, color: '#777777', temperature_c: 25, isHazard: false, timestamp: 0, stockMotion: p };
        app.setState({ vessels, vesselIds: Object.keys(vessels), burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {}, spills: { [spill.id]: spill }, inFlightPours: [], isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null });
        root.getState().internal.subscribe({ current: ({ camera }) => { camera.position.set(0, 4, 11); camera.lookAt(0, -.2, 1.8); camera.updateMatrixWorld(); } }, 0, root);
        window.metalAudit = { app, root, three, solidSceneVolume, SimulationEngine, freePrecipitateCohorts, currentMixedPrecipitateTurbidity, escapedPose: p };
    });
    await page.waitForFunction(() => {
        let count = 0;
        window.metalAudit.root.getState().scene.traverse(mesh => {
            if (mesh.userData?.metalDeposit && mesh.count > 0) count++;
        });
        return count === 3;
    }, undefined, { timeout: 30000 });
    const manual = await page.evaluate(() => {
        const a = window.metalAudit, scene = a.root.getState().scene, records = [];
        const volume = g => { const p = g.getAttribute('position'), idx = g.index, A = new a.three.Vector3(), B = new a.three.Vector3(), C = new a.three.Vector3(); let sum = 0; for (let i = 0; i < (idx?.count ?? p.count); i += 3) {
            A.fromBufferAttribute(p, idx ? idx.getX(i) : i);
            B.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1);
            C.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2);
            sum += A.dot(B.cross(C)) / 6;
        } return Math.abs(sum); };
        scene.traverse(mesh => { if (!mesh.userData?.metalDeposit || !mesh.count)
            return; const m = new a.three.Matrix4(); let vol = 0; for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, m);
            vol += volume(mesh.geometry) * m.determinant();
        } records.push({ name: mesh.name, count: mesh.count, ...mesh.userData.metalDeposit, materialVolume: vol, metalness: mesh.material.metalness }); });
        return records;
    });
    assert.equal(manual.length, 3);
    for (const r of manual) {
        assert.ok(r.count > 0 && r.materialVolume > 0);
        assert.equal(r.metalness, .9);
    }
    for (const [formula, product, density, id] of [['Fe (nail)', 'Cu', 8.96, 'coat-0'], ['Cu (turnings)', 'Ag', 10.5, 'coat-1']]) {
        const m = manual.find(r => r.name === `stock_coating_${formula}_${product}` && r.mass_g > .09);
        assert.ok(m);
        const expected = await page.evaluate(({ id, density }) => { const a = window.metalAudit; return a.solidSceneVolume(a.app.getState().vessels[id], .1 / density); }, { id, density });
        assert.ok(Math.abs(m.materialVolume / expected - 1) < 2e-6);
    }
    const escaped = manual.find(r => r.mass_g < .09);
    assert.ok(Math.abs(escaped.materialVolume / (.05 / 8.96 * 1e-6 / .035 ** 3) - 1) < 2e-6);
    const haze = await page.evaluate(() => { const a = window.metalAudit; return Object.values(a.app.getState().vessels).map(v => { const manager = a.SimulationEngine.getManager(v.id, 'low'); const liquid = a.root.getState().scene.getObjectByName(`liquid_volume_${v.id}`); return { id: v.id, hasSnapshot: manager.hasPrecipitationSnapshot, liquidOpacity: liquid?.material.opacity, freeCohorts: a.freePrecipitateCohorts(v).length, cloudiness: manager.cloudiness, turbidity: a.currentMixedPrecipitateTurbidity(v, manager) }; }); });
    for (const state of haze) { assert.equal(state.freeCohorts, 0); assert.equal(state.cloudiness, 0); assert.equal(state.turbidity, 0); assert.ok(state.liquidOpacity < 0.3); }
    report.checks.push({ mode: 'manual-and-escaped', haze, escapedPose: await page.evaluate(() => window.metalAudit.escapedPose),
        fixture: 'Synthetic finite inventory isolates renderer volume, carrier provenance and an unrelated latest reaction. The escaped coated nail is settled by StockWorld before pausing. Reaction kinetics are not exercised here.', records: manual });
    await page.screenshot({ path: `${output}/manual-and-escaped.png` });
    await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
    const entries = await page.evaluate(async () => { const r = s => performance.getEntriesByType('resource').map(r => r.name).find(n => n.includes(s)); const { AutoExperiment, AUTO_EXPERIMENTS } = await import(r('/AutoExperiment.ts')); const original = AutoExperiment.prototype.tick; AutoExperiment.prototype.tick = function (dt) { window.metalAuto = this; return original.call(this, dt); }; return ['fe_cuso4', 'cu_agno3'].map(id => { const e = AUTO_EXPERIMENTS.find(e => e.id === id); return { id, title: e?.title }; }); });
    for (const entry of entries) {
        assert.ok(entry.title);
        await page.getByRole('button', { name: entry.title, exact: false }).first().click();
        await page.waitForFunction(id => window.metalAuto?.program.id === id, entry.id);
        await page.evaluate(async () => { const e = window.metalAuto; await e.stocks.initialize(); e.paused = false; for (let i = 0; i < 12000 && e.progress < .15 && !e.error; i++)
            e.tick(1 / 60); e.paused = true; if (e.error)
            throw Error(e.error); const r = performance.getEntriesByType('resource').map(r => r.name).find(n => n.includes('/@react-three_fiber.js')); const { _roots } = await import(r); window.metalAutoRoot = _roots.get(document.querySelector('canvas')).store; window.metalAutoRoot.getState().invalidate(); });
        await page.waitForTimeout(1400);
        const actual = await page.evaluate(async () => {
            const e = window.metalAuto, records = [], resources = performance.getEntriesByType('resource').map(r => r.name), resource = s => resources.find(n => n.includes(s));
            const { geometryVolume } = await import(resource('/src/science/stockSolidGeometry.ts'));
            const { solidSceneVolume } = await import(resource('/src/science/vesselDimensions.ts'));
            const { attachedMetalForCarrier } = await import(resource('/src/science/metalSurfaceAppearance.ts'));
            const { autoSolid } = await import(resource('/autoSolid.ts'));
            const three = await import(resource('/three.js'));
            const scene = window.metalAutoRoot.getState().scene;
            scene.traverse(mesh => { if (mesh.userData?.metalDeposit && mesh.count) {
                const matrix = new three.Matrix4();
                let volume = 0;
                for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, matrix);
                    volume += geometryVolume(mesh.geometry) * matrix.determinant();
                }
                records.push({ name: mesh.name, count: mesh.count, capacity: mesh.instanceMatrix.count, ...mesh.userData.metalDeposit, materialVolume: volume, expectedVolume: solidSceneVolume(e.sample, mesh.userData.metalDeposit.mass_g / { Cu: 8.96, Ag: 10.5, Pb: 11.34 }[mesh.userData.metalDeposit.product]) });
            } });
            const formula = e.program.chemistry.species.find(s => s.role === 'reactant' && s.phase === 's').formula, solid = autoSolid(formula), node = scene.getObjectByName(`auto_stock_${formula}`);
            let powderVolume = 0;
            const matrix = new three.Matrix4();
            node?.traverse(mesh => { if (!mesh.visible || !mesh.geometry)
                return; if (mesh.geometry.userData.powder)
                powderVolume += mesh.geometry.userData.powder.representedVolume * .55;
            else if (mesh.isInstancedMesh && !mesh.userData.metalDeposit) {
                for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, matrix);
                    powderVolume += geometryVolume(mesh.geometry) * matrix.determinant();
                }
            } });
            const coreMass = e.sample.contents.filter(r => r.formula === formula && r.phase === 's' && !r.solidOrigin).reduce((s, r) => s + r.mass_g, 0), coatingVolume = e.sample.stockMotion.grains.reduce((s, p) => s + attachedMetalForCarrier(e.sample, p.id).volume_ml, 0);
            return { progress: e.progress, elapsed_s: e.elapsed, error: e.error, records, powder: solid.morphology === 'POWDER' ? { materialVolume: powderVolume, expectedVolume: solidSceneVolume(e.sample, coreMass / solid.density + coatingVolume), coatingVolume_ml: coatingVolume } : undefined, depositRows: e.sample.contents.filter(r => r.depositSubstrate), carriers: e.sample.stockMotion.grains.map(p => ({ id: p.id, mass_g: p.mass_g })) };
        });
        report.checks.push({ mode: 'auto', id: entry.id, ...actual });
        console.log(JSON.stringify({ id: entry.id, progress: actual.progress, powder: actual.powder, records: actual.records }));
        assert.ok(actual.progress >= .15, 'Natural dosing and contact must reach the requested reaction progress');
        if (actual.powder) {
            assert.ok(actual.powder.coatingVolume_ml > 0);
            assert.ok(Math.abs(actual.powder.materialVolume / actual.powder.expectedVolume - 1) < 2e-5);
        }
        else {
            assert.ok(actual.records.some(r => r.mass_g > 0 && r.count > 0));
            for (const record of actual.records) { assert.ok(record.count <= record.capacity); assert.equal(record.capacity, actual.carriers.length * 8); assert.ok(Math.abs(record.materialVolume / record.expectedVolume - 1) < 2e-6); }
        }
        await page.getByRole('button', { name: 'Góc cận cảnh' }).click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${output}/auto-${entry.id}.png` });
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.consoleErrors, []);
    console.log(JSON.stringify({ checks: report.checks.map(c => ({ mode: c.mode, id: c.id, records: c.records.length })), errors: report.errors }));
}
catch (e) {
    report.failure = e.stack ?? String(e);
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => { });
    throw e;
}
finally {
    await browser.close();
    writeFileSync(`${output}/browser-audit.json`, JSON.stringify(report, null, 2));
}
