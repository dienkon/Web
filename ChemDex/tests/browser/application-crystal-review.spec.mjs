import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const images=JSON.parse(fs.readFileSync('data/application-image-provenance.json','utf8')).topics.filter(p=>p.status==='downloaded');

test('electron and crystal visualizations occupy separate full-width rows at every screen size',async({page})=>{
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/?element=Fe');
  const cards=page.locator('.structure-visual-grid > .visual-card');await expect(cards).toHaveCount(2);
  await cards.first().scrollIntoViewIfNeeded();
  const bounds=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};}));
  expect(bounds[1].y).toBeGreaterThanOrEqual(bounds[0].bottom+10);
  expect(Math.abs(bounds[0].width-bounds[1].width)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});

test('complex alpha manganese renders 58 sites and atom selection exposes source coordinates',async({page})=>{
 await page.goto('/?element=Mn');const model=page.locator('#crystal-widget [data-crystal-id="nguyen-to-mn"]');
 await expect(model).toContainText('58 vị trí/ô');await expect(model).toContainText('I -4 3 m');
 await model.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
 await expect(model.locator('[role=status]')).toHaveAttribute('data-state','ready');
 const canvas=model.locator('canvas'),box=await canvas.boundingBox();await canvas.click({position:{x:box.width/2,y:box.height/2}});
 await expect(model.locator('[data-crystal-selection]')).toContainText('Mn');
 await expect(model.locator('[data-crystal-selection]')).toContainText('Cartesian');
 await model.locator('.crystal-evidence > summary').click();await expect(model.locator('.crystal-evidence tbody tr')).toHaveCount(4);
});

test('Wiki reference cells distinguish DHCP, tetragonal metrics and the radium source inconsistency',async({page})=>{
 for(const [symbol,id,count] of [['Pm','nguyen-to-pm',4],['Pa','nguyen-to-pa',2],['Ra','nguyen-to-ra',2]]){
  await page.goto(`/?element=${symbol}`);const model=page.locator(`#crystal-widget [data-crystal-id="${id}"]`);
  await expect(model).toContainText(`${count} vị trí/ô`);await expect(model.locator('.crystal-heading')).toContainText('Prototype');
  await expect(model).not.toContainText('AMCSD null');
  await model.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();await expect(model.locator('[role=status]')).toHaveAttribute('data-state','ready');
  if(symbol==='Ra'){await model.locator('.crystal-wiki-reference summary').click();await expect(model).toContainText('cF4 không nhất quán');}
  if(symbol==='Pa'){await expect(model.locator('.crystal-metric')).toContainText('3,921');await expect(model.locator('.crystal-metric')).toContainText('3,235');}
 }
});

test('application images and their attribution remain visible on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const symbol of ['H','He','Fe','Au','Og']){
  await page.goto(`/?element=${symbol}`);const figures=page.locator('#sec-applications .application-figure');
  await expect(figures.first()).toBeAttached();await figures.first().scrollIntoViewIfNeeded();
  const first=figures.first();await expect.poll(()=>first.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  await expect(first.locator('figcaption')).toBeVisible();await expect(first.getByRole('link',{name:'Nguồn ảnh ↗',exact:true})).toBeVisible();
  const dims=await first.evaluate(n=>{const f=n.getBoundingClientRect(),c=n.querySelector('figcaption').getBoundingClientRect();return {captionBottom:c.bottom,figureBottom:f.bottom};});
  expect(dims.captionBottom).toBeLessThanOrEqual(dims.figureBottom+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});

test('all 101 local application illustrations decode in the production browser',async({page})=>{
 await page.goto('/?element=H');
 const failures=await page.evaluate(async urls=>{
  const failures=[];
  for(let i=0;i<urls.length;i+=10)await Promise.all(urls.slice(i,i+10).map(url=>new Promise(resolve=>{
   const img=new Image();img.onload=()=>{if(!img.naturalWidth)failures.push(url);resolve();};img.onerror=()=>{failures.push(url);resolve();};img.src=url;
  })));
  return failures;
 },images.map(r=>r.file));
 expect(failures).toEqual([]);
});
