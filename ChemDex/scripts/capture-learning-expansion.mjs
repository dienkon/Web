import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base=process.env.CHEMDEX_CAPTURE_URL || 'http://127.0.0.1:4186';
const directory='docs/learning-expansion/2026-11-12/screenshots';
await fs.mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(base+'/?element=He');
  const helium=page.locator('[data-crystal-id="chat-solid-helium"]');
  await helium.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
  await helium.locator('[role=status][data-state=ready]').waitFor();
  await helium.scrollIntoViewIfNeeded();
  await page.screenshot({path:directory+'/helium-pha-ran.png'});

  const visuals=JSON.parse(await fs.readFile('shared/substance-visuals.generated.json','utf8'));
  const urea=Object.keys(visuals).find(slug=>visuals[slug].formula==='CH4N2O');
  await page.goto(`${base}/trung-tam/tai-lieu-so/${urea}/`);
  await page.getByRole('button',{name:'Khám phá 3D',exact:true}).click();
  const crystal=page.locator('[data-crystal-id="chat-urea"]');
  await crystal.getByRole('button',{name:'Xem mạng tinh thể 3D',exact:true}).click();
  await crystal.locator('[role=status][data-state=ready]').waitFor();
  await crystal.scrollIntoViewIfNeeded();
  await page.screenshot({path:directory+'/urea-neutron.png'});

  await page.goto(base+'/lab-3d/?experiment=agcl_curdy_precipitation&observe=1');
  const observation=page.getByRole('region',{name:'Quan sát tự động'});
  await observation.getByRole('status').filter({hasText:'Đã chạy phản ứng'}).waitFor({timeout:60000});
  await page.getByRole('button',{name:'Thông tin bình',exact:true}).click();
  await page.getByText('AgCl',{exact:true}).first().waitFor();
  await observation.scrollIntoViewIfNeeded();
  await page.screenshot({path:directory+'/quan-sat-agcl.png'});
  console.log('Captured 3 production views with actual source data and the running simulation.');
} finally { await browser.close(); }
