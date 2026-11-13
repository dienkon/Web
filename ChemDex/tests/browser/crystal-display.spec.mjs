import {test,expect} from '@playwright/test';

async function openCrystal(page,id){
 await page.goto(`/tien-ich/cau-truc-3d/?compound=${id}`);
 await page.getByRole('group',{name:'Cách biểu diễn cấu trúc'}).getByRole('button',{name:'Tinh thể',exact:true}).click();
 const widget=page.locator('.published-crystal').first();
 await widget.evaluate(w=>{const start=w.querySelector('[data-crystal-start]');if(start&&!start.disabled)start.click();});
 await expect(widget.locator('[role=status]')).toHaveAttribute('data-state','ready');
 await expect(widget.locator('.published-crystal-stage')).toHaveAttribute('data-draw-calls',/\d+/);
 return widget;
}

test('the crystal opens bright with connections, no grid or furniture, and working instance picking',async({page})=>{
 const widget=await openCrystal(page,'crystal-nacl'),stage=widget.locator('.published-crystal-stage');
 expect(Number(await stage.getAttribute('data-display-connections'))).toBeGreaterThan(0);
 expect(Number(await stage.getAttribute('data-draw-calls'))).toBeLessThan(8);
 await expect(widget.getByRole('button',{name:'Hiện khung ô mạng',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(widget.getByRole('button',{name:'Hiện cảnh trưng bày',exact:true})).toHaveAttribute('aria-pressed','false');
 expect(await widget.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(248, 252, 253)');
 await stage.scrollIntoViewIfNeeded();const box=await stage.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect(widget.locator('[data-crystal-selection]')).toContainText('100%');
 const before=Number(await stage.getAttribute('data-draw-calls'));
 await widget.getByRole('button',{name:'Ẩn đường nối',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBeLessThan(before);
 await widget.getByRole('button',{name:'Hiện đường nối',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before);
 await expect(widget.locator('[data-crystal-hydrogen-bonds]')).toBeHidden();
 await expect(widget.locator('[data-crystal-clusters]')).toBeHidden();
});

test('ice II shows a separate, batched hydrogen network with independent controls and element visibility',async({page},testInfo)=>{
 const widget=await openCrystal(page,'cid-962'),stage=widget.locator('.published-crystal-stage'),toggle=widget.locator('[data-crystal-hydrogen-bonds]');
 await expect(widget.locator('.crystal-heading')).toContainText('Băng II');
 await expect(widget.locator('.crystal-note')).toContainText('Không mô tả nước lỏng hay băng Ih');
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','48');
 await expect(stage).toHaveAttribute('data-boundary-copies','90');
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','42');
 await expect(stage).toHaveAttribute('data-boundary-copies','0');
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-boundary-copies','90');
 await expect(stage).toHaveAttribute('data-hydrogen-bond-evidence','water-geometric');
 await expect(toggle).toHaveAttribute('aria-pressed','true');
 await stage.scrollIntoViewIfNeeded();await stage.screenshot({path:testInfo.outputPath('ice-ii-network.png')});
 const before=Number(await stage.getAttribute('data-draw-calls'));expect(before).toBeLessThan(8);
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await widget.getByRole('button',{name:'Hiện 2 × 2 × 2 ô',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-display-hydrogen-bonds'))).toBeGreaterThanOrEqual(192);
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await toggle.click();await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before);
 await widget.getByRole('button',{name:'Ẩn đường nối',exact:true}).click();
 await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await widget.locator('.crystal-legend button').filter({hasText:'● H'}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(1);
 await widget.locator('.crystal-legend button').filter({hasText:'● H'}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await expect(widget.locator('[data-crystal-cell]')).toHaveAttribute('aria-pressed','false');
});

test('methanol uses the reported CIF hydrogen network and keeps its controls separate from solid rods',async({page},testInfo)=>{
 const widget=await openCrystal(page,'cid-887'),stage=widget.locator('.published-crystal-stage'),toggle=widget.locator('[data-crystal-hydrogen-bonds]');
 await expect(widget.locator('.crystal-heading')).toContainText('Methanol rắn · 122 K');
 await expect(stage).toHaveAttribute('data-hydrogen-bond-evidence','source-cif');
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','11');
 await expect(stage).toHaveAttribute('data-boundary-copies','72');
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','8');
 await expect(stage).toHaveAttribute('data-boundary-copies','0');
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-complete-clusters','true');
 await widget.locator('.crystal-display-notes summary').click();
 await expect(widget.locator('.crystal-display-notes')).toContainText('bảng geom_hbond của CIF nguồn');
 await expect(widget.locator('.crystal-display-notes')).not.toContainText('O···O ≤ 3,0 Å');
 await stage.scrollIntoViewIfNeeded();await stage.screenshot({path:testInfo.outputPath('methanol-hydrogen-network.png')});
 const before=Number(await stage.getAttribute('data-draw-calls'));expect(before).toBeLessThan(12);
 await toggle.click();await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await widget.getByRole('button',{name:'Hiện 2 × 2 × 2 ô',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-display-hydrogen-bonds'))).toBeGreaterThanOrEqual(48);
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before-1);
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-boundary-copies','0');
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','48');
 await widget.getByRole('button',{name:'Hiện 1 ô mạng',exact:true}).click();
 await expect(stage).toHaveAttribute('data-complete-clusters','false');
 await expect(stage).toHaveAttribute('data-display-hydrogen-bonds','8');
 await widget.locator('[data-crystal-clusters]').click();
 await expect(stage).toHaveAttribute('data-boundary-copies','72');
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await toggle.click();await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(before);
 await widget.getByRole('button',{name:'Ẩn đường nối',exact:true}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(4);
 await widget.locator('.crystal-legend button').filter({hasText:'● O'}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(2);
 await widget.locator('.crystal-legend button').filter({hasText:'● O'}).click();
 await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBe(4);
 await page.setViewportSize({width:390,height:844});
 await expect(toggle).toBeVisible();
 const bounds=await widget.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
 expect(await widget.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThan(2);
});

test('successive vertical and horizontal drags keep rotating instead of sticking at a pole',async({page})=>{
 const widget=await openCrystal(page,'cid-5793'),canvas=widget.locator('canvas');
 await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
 let previous=await canvas.screenshot();
 for(const [dx,dy]of [[0,-110],[0,-110],[100,0],[0,110],[-100,0]]){
  await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+dx,cy+dy,{steps:12});await page.mouse.up();
  const next=await canvas.screenshot();expect(next.equals(previous)).toBe(false);previous=next;
 }
 await expect(widget.locator('[data-crystal-selection]')).not.toContainText('undefined');
});

test('a dense repeated crystal stays batched and responds to touch without scrolling the page',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();
 try{
  const widget=await openCrystal(page,'cid-2519'),stage=widget.locator('.published-crystal-stage');
  await widget.getByRole('button',{name:'Hiện 2 × 2 × 2 ô',exact:true}).click();
  await expect(widget.getByRole('button',{name:'Hiện vị trí trống',exact:true})).toHaveAttribute('aria-pressed','false');
  await expect.poll(async()=>Number(await stage.getAttribute('data-display-atoms'))).toBeGreaterThan(6000);
  await expect.poll(async()=>Number(await stage.getAttribute('data-draw-calls'))).toBeLessThan(60);
  await stage.scrollIntoViewIfNeeded();const canvas=stage.locator('canvas'),before=await canvas.screenshot(),box=await canvas.boundingBox(),scroll=await page.evaluate(()=>scrollY);
  const cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*7,y:y-i*6}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  expect(Math.abs(await page.evaluate(()=>scrollY)-scroll)).toBeLessThan(2);
 }finally{await context.close();}
});
