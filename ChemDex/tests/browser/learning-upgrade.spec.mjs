import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const visualIndex=JSON.parse(fs.readFileSync('shared/substance-visuals.generated.json','utf8'));

test('application cards stay compact with mixed image and text content',async({page})=>{
 await page.goto('/?element=Be');
 const cards=page.locator('#sec-applications .application-card');await expect(cards).toHaveCount(6);
 const heights=await cards.evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,photo:!!n.querySelector('figure')})));
 expect(heights.filter(h=>!h.photo).every(h=>h.height<250)).toBe(true);
});

test('chat calls server API with history, renders multiline LaTeX and blocks duplicate sends',async({page})=>{
 let calls=0;let request;
 await page.route('**/api/gemini/chat/',async route=>{calls++;request=route.request().postDataJSON();await route.fulfill({json:{text:'Cân bằng:\n\\[\n\\ce{2H2 + O2 -> 2H2O}\n\\]\nVà $\\frac{1}{2}$.'}});});
 await page.goto('/?element=H');await page.locator('#chat-fab').click();
 await page.locator('#chat-input').fill('Vì sao phản ứng tạo nước tỏa nhiệt?');await page.locator('#chat-send-btn').click();
 await expect(page.locator('.chat-bubble-bot .katex')).toHaveCount(2);expect(calls).toBe(1);
 await expect(page.locator('.chat-bubble-bot .katex-error')).toHaveCount(0);
 await page.locator('#chat-input').fill('Nêu tiếp một ví dụ.');await page.locator('#chat-send-btn').click();
 await expect.poll(()=>calls).toBe(2);expect(request.history).toHaveLength(2);
 expect(await page.locator('#chat-panel').evaluate(n=>getComputedStyle(n).backgroundImage)).toBe('none');
});

test('discovery links open a source profile inside the digital library',async({page})=>{
 await page.goto('/?element=H');
 const link=page.getByRole('link',{name:'Henry Cavendish',exact:true}).first();
 await expect(link).toHaveAttribute('href',/\/trung-tam\/tai-lieu-so\/nha-khoa-hoc-henry-cavendish\//);
 await link.click();await expect(page.locator('article')).toContainText('1766');await expect(page.locator('article a[href*="rsc.org"]')).toBeAttached();
});

test('reaction substances and supported protocols expose real links',async({page})=>{
 await page.goto('/?element=Na');
 await expect(page.locator('.chemical-reference').first()).toBeAttached();
 await expect(page.locator('a[href="/lab-3d/?experiment=alkali_metal_water_na&observe=1"]').first()).toBeAttached();
});

test('library header stays on screen and sourced compound crystals retain controls',async({page})=>{
 const slug=Object.keys(visualIndex).find(slug=>visualIndex[slug].formula==='CuSO4·5H2O');
 await page.goto(`/trung-tam/tai-lieu-so/${slug}/`);await expect(page.locator('article')).toBeVisible();
 await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
 const crystal=page.locator('[data-crystal-id="chat-chalcanthite"]');await expect(crystal).toContainText('CuSO₄·5H₂O');
 await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
 await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 await crystal.getByRole('button',{name:'Ẩn cảnh trưng bày',exact:true}).click();await expect(crystal.locator('[data-crystal-environment]')).toHaveAttribute('aria-pressed','false');
 await crystal.getByRole('button',{name:'Ẩn nguyên tử',exact:true}).click();await expect(crystal.locator('[data-crystal-atoms]')).toHaveAttribute('aria-pressed','false');
 await page.locator('article').scrollIntoViewIfNeeded();expect((await page.locator('.reader-toolbar').boundingBox()).y).toBe(0);
});

test('small screens fit formulas, controls, header and the chat panel',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?element=Be');await page.locator('#chat-fab').click();
 const box=await page.locator('#chat-panel').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await page.goto('/trung-tam/tai-lieu-so/chat-nuoc/');await expect(page.locator('article')).toBeVisible();
 await page.locator('article').scrollIntoViewIfNeeded();await expect(page.locator('.reader-toolbar')).toBeVisible();
  expect((await page.locator('.reader-toolbar').boundingBox()).y).toBe(48);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.reader-toolbar').getByTitle('Quay lại danh sách tài liệu').click();
  await expect(page.getByRole('heading',{name:'Thư viện nguyên tố và hợp chất',exact:true})).toBeVisible();
});

test('library LaTeX repairs older doubled commands and renders fractions',async({page})=>{
 await page.goto('/trung-tam/tai-lieu-so/hidro-peoxit-h2o2/');
 await expect(page.locator('article')).toBeVisible();
 await expect(page.locator('article .katex .frac-line').first()).toBeAttached();
 await expect(page.locator('article .katex-error')).toHaveCount(0);
});

test('molecular and gas-element articles open the exact model in an embedded viewer',async({page})=>{
 for (const formula of ['C2H5OH','H2']) {
  const slug=Object.keys(visualIndex).find(s=>visualIndex[s].formula===formula);
  await page.goto(`/trung-tam/tai-lieu-so/${slug}/`);
  await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
  if(visualIndex[slug].crystals.length)await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Phân tử',exact:true}).click();
  const frame=page.frameLocator('.reader-visuals iframe');
  await expect(frame.locator('chem-structure-viewer canvas').first()).toBeAttached();
  await expect(frame.locator('.viewer-status')).toContainText(/nguyên tử|Kéo để xoay/);
  await expect(frame.locator('.catalog-list')).toBeHidden();
 }
});

test('video URL analysis installs timed questions, pauses at the scene and respects the off switch',async({page})=>{
 await page.route('https://www.youtube.com/iframe_api',route=>route.fulfill({contentType:'application/javascript',body:`window.__videoTime=0;window.YT={PlayerState:{PLAYING:1},Player:function(host,config){const p={getCurrentTime:()=>window.__videoTime,getDuration:()=>100,getPlayerState:()=>1,pauseVideo:()=>{window.__videoPaused=true},playVideo:()=>{},setPlaybackRate:()=>{},getPlaybackRate:()=>1,seekTo:t=>window.__videoTime=t,destroy:()=>{}};setTimeout(()=>config.events.onReady({target:p}),0);return p;}};window.onYouTubeIframeAPIReady();`}));
 await page.route('**/api/gemini/video-quiz',route=>route.fulfill({json:{durationSeconds:100,cues:[{id:'ai-0',seconds:12,question:'Khí nào tạo ra trong phản ứng Na với nước?',options:['H2','O2','N2','CO2'],answer:0,explain:'Natri đẩy hydrogen ra khỏi nước.'}]}}));
 await page.goto('/?element=Na');const video=page.locator('.video-shell').first();await video.scrollIntoViewIfNeeded();
 await expect(page.locator('[data-ai-quiz-status]')).toContainText('1 câu hỏi');
 await page.evaluate(()=>window.__videoTime=12.2);
 const modal=page.locator('[id^="video-modal-Na-"]');await expect(modal).toBeVisible();await expect(modal).toContainText('Khí nào tạo ra');
 expect(await page.evaluate(()=>window.__videoPaused)).toBe(true);
 await modal.getByRole('button',{name:'Bỏ qua',exact:true}).click();await expect(modal).toBeHidden();
 await page.locator('[data-ai-quiz]').uncheck();await page.evaluate(()=>window.__videoTime=12.3);await expect(modal).toBeHidden();
});

test('a linked equation prepares the matching Lab 3D preset and opens its guide',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/lab-3d/?experiment=golden_rain_synthesis');
 await expect(page.getByText('Tổng hợp "Mưa Vàng" (Kết tủa Chì Iotua PbI2)',{exact:true}).first()).toBeVisible({timeout:60000});
 await expect(page.getByRole('button',{name:/Tất cả thí nghiệm/})).toBeVisible();
 await expect(page.locator('canvas')).toBeAttached();
});

test('cold noble gas crystals and molecular nitrogen expose the measured solid phase',async({page})=>{
 for (const [symbol,id,condition] of [['He','chat-solid-helium','1,1 K'],['N','chat-solid-nitrogen-alpha','4,2 K']]) {
  await page.goto(`/?element=${symbol}`);
  const crystal=page.locator(`[data-crystal-id="${id}"]`);
  await expect(crystal).toContainText(condition);
  await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
  await expect(crystal.locator('[role=status]')).toHaveAttribute('data-state','ready');
 }
});

test('linked observation starts its real reaction, pauses and finishes with product visible',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/lab-3d/?experiment=agcl_curdy_precipitation&observe=1');
 const observation=page.getByRole('region',{name:'Quan sát tự động'});
 await expect(observation).toBeVisible({timeout:60000});
 await observation.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await expect(observation.getByRole('status')).toContainText('tạm dừng');
 await observation.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await expect(observation.getByRole('status')).toContainText('Đã chạy phản ứng',{timeout:35000});
 await expect(page.locator('canvas')).toBeAttached();
 await page.getByRole('button',{name:'Thông tin bình',exact:true}).click();
 await expect(page.getByText('AgCl',{exact:true}).first()).toBeVisible();
 await observation.getByRole('button',{name:'Chạy lại',exact:true}).click();
 await observation.getByRole('button',{name:'Dừng',exact:true}).click();
 await expect(observation.getByRole('status')).toContainText('Đã dừng');
 await observation.getByRole('button',{name:'Tự thực hành',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Đong dung dịch Bạc Nitrat vào ống đong',exact:true})).toBeVisible();
});
