import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'lab-3d/docs/research/reaction-data-1000plus');
await fs.mkdir(output,{recursive:true});
const catalog=JSON.parse(await fs.readFile(path.join(root,'shared/reaction-catalog.generated.json'),'utf8'));
const chains=JSON.parse(await fs.readFile(path.join(root,'shared/reaction-chains.generated.json'),'utf8'));
const labOrigin=process.env.LAB_CATALOG_ORIGIN??'http://127.0.0.1:6769';
const chainOrigin=process.env.CHAIN_CATALOG_ORIGIN??'http://127.0.0.1:6774';
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checkedAt:new Date().toISOString(),browser:browser.version(),build:'production',checks:[],errors:[],uiApiRequests:[],counts:{reactions:catalog.count,netIonic:catalog.counts.netTransformations,threeStepChains:chains.count}};
const passed=(name,details={})=>{report.checks.push({name,...details});console.log(JSON.stringify({passed:name,...details}));};
const monitor=page=>{page.on('pageerror',error=>report.errors.push(error.message));};

try{
  // Browser computation must work when API endpoints are unavailable.
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>localStorage.setItem('chemlab_vfx_quality_preference','potato'));
  await context.route('**/api/**',route=>{report.uiApiRequests.push(new URL(route.request().url()).pathname);return route.abort();});
  const lab=await context.newPage();monitor(lab);
  await lab.goto(labOrigin,{waitUntil:'domcontentloaded',timeout:60000});
  await expect(lab.locator('canvas')).toBeVisible({timeout:60000});
  await lab.getByRole('button',{name:/^(bài học|guide)$/i}).click();
  await lab.getByRole('button',{name:'Kho mở rộng & chuỗi',exact:true}).click();
  const panel=lab.getByRole('region',{name:'Kho phản ứng và chuỗi'});
  // The section is labelled but has no explicit landmark role in all browsers.
  const section=lab.locator('section[aria-label="Kho phản ứng và chuỗi"]');
  await expect(section.getByRole('heading',{level:3})).toContainText(catalog.count.toLocaleString('vi-VN'),{timeout:30000});
  await expect(section.locator('button:has(> span.font-mono)')).toHaveCount(40);
  for(const [family,count] of Object.entries(catalog.counts.families)){
    await section.getByLabel('Nhóm trong kho phản ứng').selectOption(family);
    await expect(section.getByRole('status')).toContainText(`${count.toLocaleString('vi-VN')} kết quả`);
  }
  passed('Lab: all 17 family filters and bounded pagination',{familyCount:Object.keys(catalog.counts.families).length});
  await section.getByLabel('Nhóm trong kho phản ứng').selectOption('precipitation');
  await section.getByLabel('Tìm trong kho phản ứng').fill('Ba(NO3)2');
  await section.locator('button:has(> span.font-mono)').filter({hasText:'K2SO4'}).first().click();
  await expect(section.getByTestId('catalog-equation')).toContainText('2KNO3(aq)');
  const equation=await section.getByTestId('catalog-equation').innerText();assert.ok(!equation.includes('Na'));
  assert.ok((await section.locator('a[href^="https://"]').count())>0);
  await lab.screenshot({path:path.join(output,'lab-catalog-detail.png'),fullPage:true});
  passed('Lab: correct polyvalent counterions, structured equation and source links',{equation});
  await section.getByRole('button',{name:'Chuỗi phản ứng',exact:true}).click();
  await section.getByRole('button',{name:'Phân tích chuỗi',exact:true}).click();
  await expect(section.locator('article')).toHaveCount(4);
  await lab.screenshot({path:path.join(output,'lab-calcium-chain.png'),fullPage:true});
  await section.getByLabel('Chất đầu của chuỗi').fill('S');
  await section.getByLabel('Chất cuối của chuỗi').fill('H2SO4');
  await section.getByRole('button',{name:'Tìm chuỗi',exact:true}).click();
  await expect(section.locator('article')).toHaveCount(3);
  await expect(section.locator('article').last()).toContainText('H2SO4');
  passed('Lab: analyze four-step cycle and generate sulfur chain');
  await section.getByRole('button',{name:'Mở kho chuỗi mẫu 3 bước',exact:true}).click();
  const examples=section.locator('section[aria-label="Chuỗi mẫu có nguồn"]');
  await expect(examples.getByRole('heading')).toContainText(chains.count.toLocaleString('vi-VN'),{timeout:30000});
  await examples.getByLabel('Lọc chuỗi mẫu theo chất').fill('Fe');
  await examples.locator('button.font-mono').first().click();
  await expect(section.locator('article')).toHaveCount(3);
  await lab.screenshot({path:path.join(output,'lab-chain-examples.png'),fullPage:true});
  passed('Lab: load, filter and open the real three-step chain library',{chainCount:chains.count});
  await section.getByLabel('Chuỗi chất cần phân tích').fill('Cu -> NaOH');
  await section.getByRole('button',{name:'Phân tích chuỗi',exact:true}).click();
  await expect(section.getByRole('alert')).toContainText('Chưa có');
  await expect(section.locator('article')).toHaveCount(0);
  passed('Lab: unsupported transitions produce no invented reaction');
  await lab.getByRole('button',{name:'Bài thực hành',exact:true}).click();
  await expect(lab.getByLabel('Tìm phản ứng')).toBeVisible();
  passed('Lab: original lesson library remains available');
  await lab.setViewportSize({width:390,height:844});
  await lab.getByTitle('Mở/Đóng phản ứng & chuẩn độ',{exact:true}).click();
  await lab.getByRole('button',{name:'Kho mở rộng & chuỗi',exact:true}).click();
  await expect(lab.getByLabel('Tìm trong kho phản ứng')).toBeVisible();
  await lab.locator('section[aria-label="Kho phản ứng và chuỗi"]').getByRole('button',{name:'Chuỗi phản ứng',exact:true}).click();
  await lab.getByLabel('Chuỗi chất cần phân tích').fill('Na -> NaOH -> NaCl -> AgCl');
  await lab.getByRole('button',{name:'Phân tích chuỗi',exact:true}).click();
  await expect(lab.locator('section[aria-label="Kho phản ứng và chuỗi"] article')).toHaveCount(3);
  await lab.locator('section[aria-label="Kho phản ứng và chuỗi"]').getByRole('button',{name:'Tra cứu',exact:true}).click();
  await lab.getByLabel('Tìm trong kho phản ứng').fill('CuSO₄');
  const metrics=await lab.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(metrics.scrollWidth<=metrics.width);
  await lab.screenshot({path:path.join(output,'lab-catalog-mobile.png'),fullPage:true});
  passed('Lab: catalog and chain controls are clickable at 390px without document overflow',metrics);

  const tool=await context.newPage();monitor(tool);
  await tool.goto(`${chainOrigin}/tien-ich/phuong-trinh/chuoi-phan-ung/`,{waitUntil:'domcontentloaded',timeout:60000});
  await tool.locator('#chain').fill('Fe -> FeCl2 -> Fe(OH)2 -> Fe(OH)3 -> Fe2O3');
  await tool.getByRole('button',{name:'Phân tích ngay',exact:true}).click();
  await expect(tool.getByText('Phản ứng 1 / 4',{exact:true})).toBeVisible({timeout:30000});
  await expect(tool.locator('div.relative.p-6.rounded-2xl').last()).toHaveCSS('opacity','1');
  await expect(tool.locator('.katex-error')).toHaveCount(0);
  await expect(tool.getByRole('link',{name:/OpenStax/}).first()).toBeVisible();
  await tool.screenshot({path:path.join(output,'chain-tool-analysis.png'),fullPage:true});
  passed('Chain tool: exact iron intermediates and source-backed LaTeX with APIs blocked');
  await tool.getByRole('button',{name:'Tạo chuỗi mới',exact:true}).click();
  await tool.locator('#start').fill('S');await tool.locator('#end').fill('H2SO4');
  await tool.getByRole('button',{name:'Tự động tạo chuỗi',exact:true}).click();
  await expect(tool.getByText('Phản ứng 1 / 3',{exact:true})).toBeVisible();
  await expect(tool.locator('div.relative.p-6.rounded-2xl').last()).toHaveCSS('opacity','1');
  await expect(tool.locator('.katex-error')).toHaveCount(0);
  await tool.screenshot({path:path.join(output,'chain-tool-sulfur.png'),fullPage:true});
  await tool.locator('#start').fill('Xe');await tool.locator('#end').fill('Au');
  await tool.getByRole('button',{name:'Tự động tạo chuỗi',exact:true}).click();
  await expect(tool.getByText('Chất đầu/cuối chưa có danh tính rõ ràng trong kho; chưa thể xác nhận chuỗi.',{exact:true})).toBeVisible();
  passed('Chain tool: generation and explicit unknown state without AI fallback');
  assert.deepEqual(report.uiApiRequests,[]);
  await context.close();

  // Independently exercise all public and legacy HTTP routes of the actual server.
  for(const [endpoint,body] of [['/api/gemini/chain/',{action:'generate',start:'S',end:'H2SO4',minSteps:3}],['/api/analyze',{chain:'Cu -> CuO -> CuCl2 -> Cu(OH)2'}],['/api/generate',{start:'Cu',end:'Cu(OH)2',minSteps:3}]]){
    const response=await fetch(chainOrigin+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status,200);const result=await response.json();assert.equal(result.source,'catalog');assert.equal(result.status,'found');assert.equal(result.steps.length,3);
    passed('HTTP: '+endpoint,{steps:result.steps.length,source:result.source});
  }
  assert.deepEqual(report.errors,[]);
}catch(error){
  report.errors.push(error.stack??String(error));process.exitCode=1;
  for(const [number,page] of browser.contexts().flatMap(context=>context.pages()).entries()){
    try{await page.screenshot({path:path.join(output,`failure-${number}.png`),fullPage:true});}catch{}
  }
}
finally{await browser.close();await fs.writeFile(path.join(output,'browser-review.json'),JSON.stringify(report,null,2)+'\n');}
