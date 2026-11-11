import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const out=path.resolve(import.meta.dirname,'../docs/periodic-table-audit/2026-11-11/screenshots');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:4173/?element=Fe');
 await page.locator('#detail-hero h2').waitFor();
 await page.evaluate(()=>document.getAnimations().forEach(a=>a.finish()));
 await expect(page.locator('#sec-general')).toHaveCSS('opacity','1');
 await page.screenshot({path:path.join(out,'iron-desktop.png'),animations:'disabled'});
 await page.locator('#sec-structure-isotopes').scrollIntoViewIfNeeded();
 await expect(page.locator('#sec-structure')).toHaveCSS('opacity','1');
 await page.screenshot({path:path.join(out,'iron-isotopes.png'),animations:'disabled'});
 const model=page.locator('[id^="model-shell-Fe"]');
 await model.scrollIntoViewIfNeeded();
 await model.getByRole('button',{name:/Nhấn để xem mô hình/}).click();
 await page.locator('[id^="model-status-Fe"][data-state="ready"]').waitFor();
 await page.getByRole('button',{name:'Tạm dừng xoay',exact:true}).click();
 await page.screenshot({path:path.join(out,'iron-mineral.png'),animations:'disabled'});
 await page.setViewportSize({width:360,height:800});
 await page.goto('http://127.0.0.1:4173/?element=Og');
 await page.locator('#detail-hero h2').waitFor();
 await expect(page.locator('#detail-hero')).toHaveCSS('opacity','1');
 await page.screenshot({path:path.join(out,'oganesson-mobile.png'),animations:'disabled'});
 await page.locator('#sec-reactions').scrollIntoViewIfNeeded();
 await expect(page.locator('#sec-reactions')).toHaveCSS('opacity','1');
 await page.screenshot({path:path.join(out,'oganesson-reactions-mobile.png'),animations:'disabled'});
 console.log('Saved 5 review screenshots');
}finally{await browser.close();}
