import {test,expect} from '@playwright/test';

test('students can switch chain, cis/trans and ring isomers with matching coordinates, source and export',async({page})=>{
 await page.goto('/tien-ich/cau-truc-3d/?compound=formula-C4H8');
 const viewer=page.locator('chem-structure-viewer'),select=viewer.getByRole('combobox',{name:'Đồng phân đang xem'});
 await expect(viewer.locator('.viewer-status')).toContainText('But-1-ene · 12 nguyên tử');
 await select.selectOption('pubchem-5287573');
 await expect(viewer.locator('.viewer-status')).toContainText('cis-But-2-ene');
 await expect(viewer.locator('.viewer-isomers')).toContainText('cùng phía');
 expect(await viewer.evaluate(v=>v.raw.split(/\r?\n/)[0])).toBe('5287573');
 await viewer.getByRole('checkbox',{name:'Đồ họa nhẹ',exact:true}).check();
 await expect(viewer.locator('.viewer-status')).toContainText('cis-But-2-ene');
 await select.selectOption('pubchem-62695');
 await expect(viewer.locator('.viewer-status')).toContainText('trans-But-2-ene');
 await expect(viewer.locator('.viewer-isomers')).toContainText('khác phía');
 await select.selectOption('pubchem-9250');
 await expect(viewer.locator('.viewer-status')).toContainText('Cyclobutane · 12 nguyên tử · 12 liên kết');
 await expect(viewer.locator('.viewer-source a').first()).toHaveAttribute('href','https://pubchem.ncbi.nlm.nih.gov/compound/9250');
 const download=page.waitForEvent('download');await viewer.getByRole('button',{name:'SDF / CIF ↓',exact:true}).click();
 expect((await download).suggestedFilename()).toBe('pubchem-9250.sdf');
 await page.reload();await expect(viewer.locator('.viewer-status')).toContainText('Cyclobutane');
});

test('mobile formula examples stay readable and named profiles keep their own identity',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/tien-ich/cau-truc-3d/?compound=formula-C5H8&isomer=pubchem-12310');
 const viewer=page.locator('chem-structure-viewer');
 await expect(viewer.locator('.viewer-status')).toContainText('Pent-2-yne · 13 nguyên tử');
 await expect(viewer.locator('.viewer-isomers')).toContainText('C số 2');
 await viewer.getByText('Đồng phân là gì?',{exact:true}).click();
 await expect(viewer.locator('.viewer-isomers')).toContainText('một số ví dụ');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto('/tien-ich/cau-truc-3d/?compound=cid-5793');
 await expect(page.locator('chem-structure-viewer .viewer-status')).toContainText('nguyên tử');
 await expect(page.getByRole('combobox',{name:'Đồng phân đang xem'})).toHaveCount(0);
});

test('a missing selected source never falls back to a different formula-generated isomer',async({page})=>{
 await page.route('**/shared/structures/isomers/62695.sdf',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.goto('/tien-ich/cau-truc-3d/?compound=formula-C4H8&isomer=pubchem-62695');
 const viewer=page.locator('chem-structure-viewer');
 await expect(viewer.locator('.viewer-status')).toContainText('Chưa tải được mô hình trans-But-2-ene');
 expect(await viewer.evaluate(v=>v.raw)).toBe(null);
 await viewer.getByRole('combobox',{name:'Đồng phân đang xem'}).selectOption('pubchem-7844');
 await expect(viewer.locator('.viewer-status')).toContainText('But-1-ene · 12 nguyên tử');
});

test('the short library lesson links a named isomer and embeds the same selector',async({page})=>{
 await page.goto('/trung-tam/tai-lieu-so/c4h8-c4h8/');
 await expect(page.locator('article')).toContainText('chưa phải tên của một chất duy nhất');
 const link=page.getByRole('link',{name:'cis-But-2-ene',exact:true});
 await expect(link).toHaveAttribute('href','/tien-ich/cau-truc-3d/?compound=formula-C4H8&isomer=pubchem-5287573');
 await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
 await expect(page.locator('.reader-visual-note')).toContainText('Chọn tên đồng phân');
 const frame=page.frameLocator('.reader-visuals iframe');
 await frame.getByRole('combobox',{name:'Đồng phân đang xem'}).selectOption('pubchem-9250');
 await expect(frame.locator('.viewer-status')).toContainText('Cyclobutane');
 await page.getByText('Xem lời giải',{exact:true}).click();
 await expect(page.locator('article')).toContainText('12 nguyên tử');
 await link.click();
 await expect(page.locator('chem-structure-viewer .viewer-status')).toContainText('cis-But-2-ene');
});
