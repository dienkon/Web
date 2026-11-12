import { test, expect } from '@playwright/test';

test('library switches between a measured molecular crystal and its individual conformer',async({page})=>{
 await page.goto('/trung-tam/tai-lieu-so/aspirin-c9h8o4/');
 await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
 const controls=page.getByRole('group',{name:'Cách biểu diễn cấu trúc'});
 const crystal=page.locator('[data-crystal-id="cod-7050902"]');
 await expect(crystal).toContainText('300 K');
 await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
 await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 await controls.getByRole('button',{name:'Phân tử',exact:true}).click();
 await expect(crystal).toHaveCount(0);
 const frame=page.frameLocator('.reader-visuals iframe');
 await expect(frame.locator('chem-structure-viewer .viewer-status')).toContainText('21 nguyên tử');
 await controls.getByRole('button',{name:'Tinh thể',exact:true}).click();
 await expect(page.locator('[data-crystal-id="cod-7050902"]')).toBeVisible();
 await expect(page.locator('.reader-visuals iframe')).toHaveCount(0);
});

test('the standalone viewer exposes distinct crystals for glucose and fructose',async({page})=>{
 for(const [id,phase]of [['cid-5793','cod-5000067'],['cid-5984','cod-5000065']]){
  await page.goto(`/tien-ich/cau-truc-3d/?compound=${id}`);
  const controls=page.getByRole('group',{name:'Cách biểu diễn cấu trúc'});
  await controls.getByRole('button',{name:'Tinh thể',exact:true}).click();
  const crystal=page.locator(`[data-crystal-id="${phase}"]`);
  await expect(crystal).toBeVisible();
  await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
  await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
  await expect(page.locator('chem-structure-viewer')).toBeHidden();
  await controls.getByRole('button',{name:'Phân tử',exact:true}).click();
  await expect(page.locator('chem-structure-viewer canvas').first()).toBeVisible();
 }
});

test('molecular scenery changes presentation without changing atoms, distances or exported source',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=cid-962');
 const viewer=page.locator('chem-structure-viewer');
 await expect(viewer.locator('.viewer-status')).toContainText('3 nguyên tử');
 const snapshot=()=>viewer.evaluate(element=>({atoms:element.parsedModel.atoms,raw:element.raw,rendered:element.viewer?.getModel()?.selectedAtoms({}).map(a=>({elem:a.elem,x:a.x,y:a.y,z:a.z})),environment:!!element.environment}));
 const before=await snapshot();expect(before.environment).toBe(true);expect(before.rendered).toHaveLength(3);
 await viewer.getByRole('button',{name:'Ẩn cảnh trưng bày',exact:true}).click();
 const after=await snapshot();expect(after.environment).toBe(false);expect(after.atoms).toEqual(before.atoms);expect(after.rendered).toEqual(before.rendered);expect(after.raw).toBe(before.raw);
 await viewer.getByRole('button',{name:'Hiện cảnh trưng bày',exact:true}).click();
 expect((await snapshot()).environment).toBe(true);
 await viewer.getByRole('checkbox',{name:'Đồ họa nhẹ',exact:true}).check();
 await expect(viewer.locator('.viewer-status')).toContainText('3 nguyên tử');
 expect((await snapshot()).atoms).toEqual(before.atoms);
});

test('small screens fit the new crystal controls and keep the reader exit available',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/trung-tam/tai-lieu-so/kali-hidroxit-koh/');
 await expect(page.locator('article')).toBeVisible();
 await page.goto('/trung-tam/tai-lieu-so/thuoc-tim-kmno4/');
 await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
 const crystal=page.locator('[data-crystal-id="cod-2310631"]');
 await expect(crystal).toBeVisible();
 await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
 await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect((await page.locator('.reader-toolbar').boundingBox()).y).toBe(48);
});

test('the superseded CrCl3 structure is not offered as an actual crystal',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=formula-CrCl3');
 await expect(page.locator('chem-structure-viewer .viewer-status')).toContainText('nguyên tử');
 await expect(page.getByRole('group',{name:'Cách biểu diễn cấu trúc'})).toHaveCount(0);
 await expect(page.locator('[data-crystal-id="cod-1010575"]')).toHaveCount(0);
});
