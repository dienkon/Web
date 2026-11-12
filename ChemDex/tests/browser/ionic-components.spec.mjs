import {test,expect} from '@playwright/test';

test('copper sulfate shows whole-ion charges and only internal sulfate bonds in component mode',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=chem-cuso4');
 await expect(page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Tinh thể',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Thành phần',exact:true}).click();
 const viewer=page.locator('chem-structure-viewer');await expect(viewer.locator('.viewer-status')).toContainText('6 nguyên tử · 4 liên kết trong nhóm');
 await expect(viewer.getByLabel('Các nhóm thành phần')).toContainText('Cu²⁺');await expect(viewer.getByLabel('Các nhóm thành phần')).toContainText('SO₄²⁻');
 const actual=await viewer.evaluate(v=>({rendered:v.viewer.getModel().selectedAtoms({}).map(a=>({elem:a.elem,bonds:a.bonds})),model:v.parsedModel}));
 expect(actual.rendered[0].elem).toBe('Cu');expect(actual.rendered[0].bonds).toHaveLength(0);expect(actual.model.groups).toHaveLength(2);
 expect(await viewer.evaluate(v=>v.viewer.getModel().selectedAtoms({elem:'Cu'})[0].style.sphere.colorfunc({elem:'Cu'}))).toBe('#d97706');
 await expect(viewer.getByRole('button',{name:'Hiện cảnh trưng bày',exact:true})).toHaveAttribute('aria-pressed','false');
 await viewer.evaluate(v=>{const a=v.parsedModel.atoms;v.pick({...a[0],index:0});v.pick({...a[1],index:1});});
 await expect(viewer.locator('.atom-readout')).toContainText('không phải số đo cấu trúc');await expect(viewer.locator('.atom-readout')).not.toContainText('Å');
 await viewer.evaluate(v=>{v.selected=[];const a=v.parsedModel.atoms;v.pick({...a[1],index:1});v.pick({...a[2],index:2});});
 await expect(viewer.locator('.atom-readout')).toContainText('Khoảng cách minh họa:');
 const download=page.waitForEvent('download');await viewer.getByRole('button',{name:'SDF / CIF ↓',exact:true}).click();expect((await download).suggestedFilename()).toBe('chem-cuso4-thanh-phan.sdf');
 await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Tinh thể',exact:true}).click();
 const crystal=page.locator('.published-crystal').first();await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 expect(Number(await crystal.locator('.published-crystal-stage').getAttribute('data-display-connections'))).toBeGreaterThan(0);
 await expect.poll(async()=>Number(await crystal.locator('.published-crystal-stage').getAttribute('data-draw-calls'))).toBeGreaterThan(0);
});

test('NaCl starts with its real crystal and its component tab is a separate two-ion diagram',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=crystal-nacl');
 const crystal=page.locator('.published-crystal');await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 await expect(page.locator('chem-structure-viewer')).toBeHidden();
 expect(await page.locator('chem-structure-viewer').evaluate(v=>v.viewer??null)).toBe(null);
 await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Thành phần',exact:true}).click();
 const viewer=page.locator('chem-structure-viewer');await expect(viewer.locator('.viewer-status')).toContainText('2 nguyên tử · 0 liên kết trong nhóm');
 await expect(viewer.getByLabel('Các nhóm thành phần')).toContainText('Na⁺');await expect(viewer.getByLabel('Các nhóm thành phần')).toContainText('Cl⁻');
});

test('hydrate component mode retains five separate waters and the source crystal remains available',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=lab3d-336');
 await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Thành phần',exact:true}).click();
 const viewer=page.locator('chem-structure-viewer');await expect(viewer.locator('.viewer-status')).toContainText('21 nguyên tử · 14 liên kết trong nhóm');
 await expect(viewer.getByLabel('Các nhóm thành phần')).toContainText('5 × H₂O');
 const invariant=await viewer.evaluate(v=>({groups:v.parsedModel.groups,atoms:v.parsedModel.atoms,bonds:v.parsedModel.bonds}));
 expect(invariant.groups).toHaveLength(7);
 for(const bond of invariant.bonds)expect(invariant.atoms[bond.a].componentGroup).toBe(invariant.atoms[bond.b].componentGroup);
 await expect(page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Tinh thể',exact:true})).toBeVisible();
 await viewer.locator('[data-style]').selectOption('stick');expect(await viewer.evaluate(v=>v.viewer.getModel().selectedAtoms({}).length)).toBe(21);
});
