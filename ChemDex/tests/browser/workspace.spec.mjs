import { test, expect } from '@playwright/test';

test('quick search opens on the original home and follows exact element identities', async ({page})=>{
  await page.goto('/');
  await page.locator('#open-search').click();
  const dialog=page.getByRole('dialog',{name:'Bạn muốn khám phá gì?'});
  await dialog.getByRole('searchbox').fill('tinh tan');
  await expect(dialog.locator('.search-result').first()).toContainText('Bảng tính tan');
  await page.keyboard.press('Escape');
  await expect(page.locator('#open-search')).toBeFocused();
  await page.keyboard.press('Control+k');
  await dialog.getByRole('searchbox').fill('29');
  await page.keyboard.press('ArrowDown');
  await expect(dialog.locator('.search-result').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#detail-hero')).toContainText('Cu');
});

test('sidebar collapses, persists across routes and expands the laboratory group',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#chemdex-sidebar')).toHaveCSS('width','256px');
  await page.getByRole('button',{name:'Thu gọn sidebar',exact:true}).click();
  await expect(page.locator('#chemdex-sidebar')).toHaveCSS('width','64px');
  await page.locator('#chemdex-sidebar a[href="/tien-ich/"]').click();
  await expect(page.locator('#chemdex-sidebar')).toHaveCSS('width','64px');
  await page.getByRole('button',{name:'Mở rộng sidebar',exact:true}).click();
  await page.locator('#chemdex-sidebar summary').click();
  await expect(page.locator('#chemdex-sidebar a[href="/lab-3d/"]')).toBeVisible();
  await expect(page.locator('#chemdex-sidebar [aria-current="page"]')).toHaveText('Tiện Ích Học Tập');
});

test('tool directory searches without accents, filters and saves pinned tools',async({page})=>{
  await page.goto('/tien-ich/');
  await expect(page.locator('.tool-card')).toHaveCount(25);
  await page.locator('#tool-search').fill('tinh tan');
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.locator('[data-favorite-tool="tinh-tan"]').click();
  await page.locator('#tool-search').fill('');
  await page.locator('#tool-favorites').check();
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.tool-card')).toHaveCount(1);
  await page.locator('[data-favorite-tool="tinh-tan"]').click();
  await expect(page.locator('#tool-cards')).toContainText('Chưa có công cụ phù hợp');
  await page.locator('#tool-empty-reset').click();
  await page.getByRole('button',{name:'Phương trình & Phản ứng',exact:true}).click();
  await expect(page.locator('.tool-card')).toHaveCount(5);
});

test('quick equation balances atoms and reaction chain carries the entered sequence',async({page})=>{
  await page.goto('/tien-ich/');
  await page.getByRole('button',{name:'Cân bằng ngay',exact:true}).click();
  await expect(page.locator('#balance-result')).toHaveText('Fe + 4HNO3 → Fe(NO3)3 + NO + 2H2O');
  await page.locator('#balance-input').fill('H2 + O2 → H2O');
  await page.getByRole('button',{name:'Cân bằng ngay',exact:true}).click();
  await expect(page.locator('#balance-result')).toHaveText('2H2 + O2 → 2H2O');
  await page.locator('#balance-input').fill('<img>');
  await page.getByRole('button',{name:'Cân bằng ngay',exact:true}).click();
  await expect(page.locator('#balance-result')).toContainText('Kiểm tra công thức');
  await page.getByRole('button',{name:'Giải ngay →',exact:true}).click();
  await expect(page).toHaveURL(/chuoi-phan-ung\/\?q=/);
  await expect(page.locator('textarea').first()).toHaveValue('Fe → FeCl3 → Fe(OH)3 → Fe2O3');
});

test('generated lab models retain atoms, export and restore arbitrary formulas',async({page})=>{
  await page.goto('/tien-ich/cau-truc-3d/?chemical=chem-cuso4');
  await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Thành phần',exact:true}).click();
  await expect(page.locator('.viewer-status')).toContainText('6 nguyên tử');
  await expect(page.locator('chem-structure-viewer canvas')).toHaveCount(1);
  await page.locator('#search').fill('XeF6');
  await page.locator('#generate').click();
  await expect(page.locator('.viewer-status')).toContainText('7 nguyên tử');
  await expect(page.locator('.viewer-source')).toContainText('MÔ HÌNH MINH HỌA');
  await expect(page).toHaveURL(/[?&]formula=XeF6/);
  const download=page.waitForEvent('download');
  await page.locator('[data-file]').click();
  expect((await download).suggestedFilename()).toBe('generated-XeF6.sdf');
  await page.reload();
  await expect(page.locator('.viewer-status')).toContainText('7 nguyên tử');
  await page.locator('[data-fullscreen]').click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  await page.evaluate(()=>document.exitFullscreen());
});

test('software renderer rotates molecular coordinates when WebGL is unavailable',async({page})=>{
  await page.addInitScript(()=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};
  });
  await page.goto('/tien-ich/cau-truc-3d/?compound=cid-962');
  await expect(page.locator('.viewer-status')).toContainText('Kéo để xoay');
  await expect(page.locator('chem-structure-viewer canvas')).toBeVisible();
  const before=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.locator('canvas').hover();
  await page.mouse.down();await page.mouse.move(900,650,{steps:10});await page.mouse.up();
  const after=await page.locator('canvas').evaluate(c=>c.toDataURL());
  expect(before).not.toBe(after);
  await page.locator('[data-labels]').check();
  await expect(page.locator('.viewer-status')).not.toHaveClass(/error/);
});

test('360px pages keep mobile menu, search and content inside the viewport',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/tien-ich/','/on-tap/','/tien-ich/cau-truc-3d/']){
    await page.goto(route);
    await page.locator('.cd-mobile-toggle').click();
    await expect(page.locator('#chemdex-sidebar')).toBeInViewport();
    await page.locator('#open-search').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('searchbox').fill('phuong trinh');
    await page.getByRole('button',{name:'Đóng tìm kiếm'}).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.cd-mobile-toggle')).toHaveAttribute('aria-expanded','false');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('restricted local storage preserves the original home and shared search',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError');}}));
  await page.goto('/');
  await expect(page.locator('#periodic-table .el-symbol')).toHaveCount(118);
  await page.locator('#open-search').click();
  await page.getByRole('dialog').getByRole('searchbox').fill('H2O');
  await expect(page.locator('.search-result').first()).toContainText('Nước');
});

test('standalone utilities receive the same sidebar and slate palette',async({page})=>{
  await page.goto('/tien-ich/tra-cuu/tinh-tan/');
  await expect(page.locator('#chemdex-sidebar')).toHaveCount(1);
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(30, 41, 59)');
  await page.locator('#open-search').click();
  await page.getByRole('dialog').getByRole('searchbox').fill('H2O');
  await expect(page.locator('.search-result').first()).toContainText('Nước');
});

test('wheel up zooms in and wheel down zooms out without scrolling the page',async({page})=>{
  await page.goto('/tien-ich/cau-truc-3d/?compound=cid-962');
  await expect(page.locator('.viewer-status')).toContainText('Kéo để xoay');
  const viewer=page.locator('chem-structure-viewer');
  const distance=()=>viewer.evaluate(el=>el.viewer.getView()[3]);
  const before=await distance();
  await page.locator('chem-structure-viewer canvas').hover();
  const scroll=await page.evaluate(()=>scrollY);
  await page.mouse.wheel(0,-120);
  await expect.poll(distance).toBeGreaterThan(before);
  const closer=await distance();
  await page.mouse.wheel(0,120);
  await expect.poll(distance).toBeLessThan(closer);
  expect(await page.evaluate(()=>scrollY)).toBe(scroll);
});
