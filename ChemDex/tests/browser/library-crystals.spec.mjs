import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const refs=JSON.parse(fs.readFileSync('trung-tam/src/data/reference-index.generated.json','utf8'));
const authored=JSON.parse(fs.readFileSync('trung-tam/src/data/index.json','utf8'));

test('substance URLs load directly, reload and resolve old opaque links and saved IDs',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const doc=refs[0];
  await page.addInitScript(id=>{if(!localStorage.getItem('test-migration-seeded')){localStorage.setItem('bookmarks',JSON.stringify([id]));localStorage.setItem('history',JSON.stringify([id]));localStorage.setItem('test-migration-seeded','1');}},doc.legacyIds[0]);
  await page.goto(`/trung-tam/tai-lieu-so/?doc=${doc.legacyIds[0]}`);
  await expect(page).toHaveURL(new RegExp(`/tai-lieu-so/${doc.slug}/$`));
  await expect(page.getByRole('heading',{level:1,name:doc.title,exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bookmarks')))).toEqual([doc.id]);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('history')))).toEqual([doc.id]);
  await page.reload();
  await expect(page.getByRole('heading',{level:1,name:doc.title,exact:true})).toBeVisible();
  const recommendation=page.locator('.reader-suggestions').getByRole('button').first();
  const suggestedTitle=(await recommendation.locator('h4').innerText()).trim();
  const related=[...authored,...refs].find(d=>d.title===suggestedTitle);expect(related).toBeTruthy();
  await recommendation.click();
  await expect(page).toHaveURL(new RegExp(`/tai-lieu-so/${related.slug}/$`));
  await expect(page.getByRole('heading',{level:1,name:related.title,exact:true})).toBeVisible();
  await page.goBack();await expect(page.getByRole('heading',{level:1,name:doc.title,exact:true})).toBeVisible();
  await page.goForward();await expect(page.getByRole('heading',{level:1,name:related.title,exact:true})).toBeVisible();
  const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('history')));
  expect(history).toEqual([related.id,doc.id]);
  expect(errors).toEqual([]);
});

test('all 487 named document chunks load with a matching identity',async({page})=>{
  test.setTimeout(180000);
  await page.goto('/trung-tam/tai-lieu-so/');
  await expect(page.getByRole('heading',{name:'Thư viện nguyên tố và hợp chất',exact:true})).toBeVisible();
  // Check all production chunks, including their lazy-import dependencies.
  const response=await page.request.get('/trung-tam/index.html');const html=await response.text();
  const entry=/src="([^\"]+\.js)"/.exec(html)?.[1];expect(entry).toBeTruthy();
  const script=await (await page.request.get(entry)).text();
  const chunks=[...new Set([...script.matchAll(/\.\/tai-lieu\/[a-z0-9-]+\/noi-dung-[A-Za-z0-9_-]+\.js/g)].map(m=>m[0]))];
  expect(chunks.length).toBeGreaterThanOrEqual(487);
  const result=await page.evaluate(async paths=>{
    const found=[];
    for(let i=0;i<paths.length;i+=12)await Promise.all(paths.slice(i,i+12).map(async path=>{
      const module=await import('/trung-tam/assets/'+path.slice(2));
      const doc=module.default;
      if(doc?.id&&doc?.content)found.push({id:doc.id,slug:doc.slug,documentPath:doc.documentPath,characters:doc.content.length});
    }));
    return found;
  },chunks);
  expect(result).toHaveLength(487);
  const byId=new Map(result.map(d=>[d.id,d]));
  for(const doc of [...refs,...authored]){
    expect(byId.get(doc.id)?.slug).toBe(doc.slug);
    expect(byId.get(doc.id)?.documentPath).toBe(doc.documentPath);
    expect(byId.get(doc.id)?.characters).toBeGreaterThan(2500);
  }
});

test('published mineral crystal controls preserve sources, metric and atom site table',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?element=Fe');
  const lattice=page.locator('#crystal-widget [data-crystal-id="nguyen-to-fe"]');
  await lattice.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
  await expect(lattice.locator('[role=status]')).toHaveAttribute('data-state','ready');
  await expect(lattice.locator('canvas')).toBeVisible();
  await lattice.getByRole('button',{name:'Hiện 2 × 2 × 2 ô'}).click();
  await expect(lattice.getByRole('button',{name:'Hiện 1 ô mạng'})).toBeVisible();
  await lattice.getByRole('button',{name:'Ẩn khung ô mạng'}).click();
  await expect(lattice.getByRole('button',{name:'Hiện khung ô mạng'})).toHaveAttribute('aria-pressed','false');
  await lattice.locator('.crystal-evidence > summary').click();await expect(lattice.locator('.crystal-evidence tbody tr')).toHaveCount(1);
  await expect(lattice.getByRole('link',{name:'Tải CIF',exact:true})).toHaveAttribute('href',/nguyen-to-fe\.cif$/);
  const mineral=page.locator('[data-crystal-id="hematite"]');
  await expect(mineral).toContainText('R -3 c');
  await mineral.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
  await expect(mineral.locator('[role=status]')).toHaveAttribute('data-state','ready');
  await mineral.locator('summary').click();await expect(mineral.locator('tbody tr')).toHaveCount(2);
  await page.evaluate(()=>window.interlinkElement('H'));
  await expect(page.locator('[data-crystal-id="hematite"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('bauxite has separate phases and mobile crystal panels stay inside viewport',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto('/?element=Al');
  for(const id of ['gibbsite','boehmite','diaspore'])await expect(page.locator(`[data-crystal-id="${id}"]`)).toHaveCount(1);
  const mineral=page.locator('[data-crystal-id="gibbsite"]');
  await mineral.getByRole('button',{name:'Xem mạng tinh thể 3D'}).click();
  await expect(mineral.locator('[role=status]')).toHaveAttribute('data-state','ready');
  await mineral.locator('summary').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/trung-tam/tai-lieu-so/nuoc-h2o/');
  await expect(page.getByRole('heading',{level:1,name:/Nước/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
