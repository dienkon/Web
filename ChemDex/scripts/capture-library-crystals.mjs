import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'docs/library-crystal-upgrade/2026-11-11/screenshots');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4173/?element=Fe');
 const crystal=page.locator('[data-crystal-id="hematite"]');
 await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
 await crystal.locator('[data-state="ready"]').waitFor();
 await page.waitForTimeout(300);
 await crystal.screenshot({path:path.join(output,'sat-fe-hematite.png')});
 const natural=page.locator('.glass').filter({has:page.getByRole('heading',{name:'b. Trạng thái tự nhiên',exact:true})}).last();
 await natural.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 await natural.screenshot({path:path.join(output,'sat-trang-thai-tu-nhien.png')});
 await page.goto('http://127.0.0.1:4173/trung-tam/tai-lieu-so/metanol-ch4o/');
 await page.getByRole('heading',{level:1,name:/Metanol/}).waitFor();await page.waitForTimeout(300);
 await page.screenshot({path:path.join(output,'metanol-thu-vien.png')});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4173/?element=Si');
 const quartz=page.locator('[data-crystal-id="quartz"]');
 await quartz.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();await quartz.locator('[data-state="ready"]').waitFor();
 await page.waitForTimeout(300);await quartz.screenshot({path:path.join(output,'silic-quartz-dien-thoai.png')});
 console.log(JSON.stringify({screenshots:4}));
}finally{await browser.close();}
