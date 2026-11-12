import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'docs/application-crystal-review/2026-11-12/screenshots');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 // Expand the nested app scroll pane only for tall evidence captures; otherwise
 // Playwright clips content taller than the pane. Production CSS is unchanged.
 const prepare=async()=>{
  await page.addStyleTag({content:'html,body,body>main,#content-container{height:auto!important;max-height:none!important;overflow:visible!important} *{animation:none!important;transition:none!important}'});
  await page.evaluate(()=>{for(const node of document.querySelectorAll('body *'))if(['fixed','sticky'].includes(getComputedStyle(node).position))node.style.visibility='hidden';});
 };
 const open=async symbol=>{
  await page.goto(`http://127.0.0.1:4173/?element=${symbol}`);
  await prepare();
  const model=page.locator('#crystal-widget [data-crystal-id]');
  await model.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
  await model.locator('[data-state="ready"]').waitFor();
  return model;
 };
 await open('Fe');
 await page.locator('.structure-visual-grid').screenshot({path:path.join(output,'sat-hai-hang-cau-hinh-mang.png')});
 const mn=await open('Mn');
 await mn.screenshot({path:path.join(output,'mangan-alpha-58.png')});
 await mn.getByRole('button',{name:'Cầu tiếp xúc',exact:true}).click();
 await mn.screenshot({path:path.join(output,'mangan-cau-tiep-xuc.png')});
 const ra=await open('Ra');await ra.locator('.crystal-wiki-reference summary').click();
 await ra.screenshot({path:path.join(output,'radium-doi-chieu-wiki.png')});
 await page.goto('http://127.0.0.1:4173/?element=H');
 await prepare();
 const apps=page.locator('#sec-applications');await apps.scrollIntoViewIfNeeded();
 await apps.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode().catch(()=>{})));});
 await apps.screenshot({path:path.join(output,'hydrogen-ung-dung.png')});
 await page.setViewportSize({width:390,height:844});
 const po=await open('Po');await po.getByRole('button',{name:'Cầu tiếp xúc',exact:true}).click();
 await po.screenshot({path:path.join(output,'polonium-dien-thoai.png')});
 const sources=JSON.parse(await fs.readFile(path.join(root,'data/application-image-provenance.json'),'utf8')).topics.filter(p=>p.status==='downloaded');
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('about:blank');
 await page.evaluate(items=>{
  document.body.innerHTML='';document.body.style.cssText='margin:0;background:white;color:#111;font:15px Arial;';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:12px';
  for(const item of items){const card=document.createElement('div');const image=document.createElement('img');image.src='http://127.0.0.1:4173'+item.file;image.loading='eager';image.style.cssText='width:100%;height:145px;object-fit:contain;background:#f6f6f6';card.append(image,document.createTextNode(item.id));grid.append(card);}document.body.append(grid);
 },sources);
 await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode().catch(()=>{})));});
 await page.screenshot({path:path.join(output,'application-contact-sheet.jpg'),fullPage:true,type:'jpeg',quality:85});
 console.log(JSON.stringify({screenshots:7,contactSheetImages:sources.length}));
}finally{await browser.close();}
