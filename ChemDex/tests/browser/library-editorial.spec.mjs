import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const rows=['index.json','reference-index.generated.json','biography-index.generated.json','editorial-index.generated.json'].flatMap(name=>JSON.parse(fs.readFileSync(`trung-tam/src/data/${name}`,'utf8')));

test('reaction category exposes its real total and opens a Vietnamese feature with working licensed photos',async({page})=>{
  await page.goto('/trung-tam/tai-lieu-so/');
  const count=rows.filter(doc=>doc.category==='phanung').length;
  await page.getByRole('button',{name:new RegExp(`^Phản Ứng\\s+${count}$`)}).click();
  const results=page.getByRole('region',{name:'Kết quả thư viện'});
  await expect(results.getByRole('status')).toContainText(`${count} tài liệu`);
  await results.getByRole('heading',{name:/122 gram oxy/}).click();
  await expect(page).toHaveURL(/\/moxie-tao-oxy-tren-sao-hoa\/$/);
  const article=page.locator('article');
  await expect(article).toContainText('122 gram oxy');
  await expect(article).toContainText('NASA/JPL-Caltech');
  await expect(article.locator('a[href*="commons.wikimedia.org"]')).not.toHaveCount(0);
  const photo=article.locator('img[src*="/stories/moxie."]');
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.reload();
  await expect(article).toContainText('Ứng dụng hôm nay');
});

test('new long articles restore on mobile without horizontal overflow or translated prose',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const slug of ['sabatier-tu-hoi-tho-den-nuoc','dorothy-hodgkin-doc-ban-do-phan-tu','ph-va-nhung-au-trung-hau','hermann-staudinger-phan-tu-khong-qua-lon','hafnium-oxide-lop-mang-biet-giu-ky-uc','jean-pierre-sauvage-hai-vong-khong-roi-nhau','wacker-palladium-tro-lai-vong-phan-ung','xps-nhin-dien-cuc-duoi-lop-chat-long','indigo-mau-xanh-can-di-qua-mot-dang-khac']){
    await page.goto(`/trung-tam/tai-lieu-so/${slug}/`);
    await expect(page.locator('article')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await expect(page.locator('article')).not.toContainText('tạo water');
  }
});


test('rewritten compound features keep their scientific scope and load the selected photo',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/trung-tam/tai-lieu-so/dung-dich-natri-axetat-0-1-m-ch3coona/');
  const article=page.locator('article');
  await expect(article).toContainText('Không được lấy công dụng của túi sưởi');
  await expect(article).toContainText('0,1 M');
  const photo=article.locator('img[src*="/stories/sodium-acetate-crystals."]').first();
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(article).toContainText('Eva Santini, Giovanna Canu');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/trung-tam/tai-lieu-so/cacbon-monoxit-co/');
  await expect(article).toContainText('9 tháng 4 năm 2025');
  await expect(article).toContainText('không nên giới thiệu nó như một thiết bị vẫn đang gửi quan trắc mới');
});


test('wave three materials and Mars evidence display the chosen images with attribution',async({page})=>{
  for(const [slug,photo,credit] of [
    ['kevlar-dung-dich-duc-mo-loi-cho-soi-ben','aramid-fibers','Cjp24'],
    ['indigo-mau-xanh-can-di-qua-mot-dang-khac','indigo-historical-collection','Shisha-Tom'],
    ['sat-iii-oxit-gi-sat-fe2o3','opportunity-hematite-spherules','NASA/JPL/Cornell/USGS'],
  ]){
    await page.goto(`/trung-tam/tai-lieu-so/${slug}/`);
    const article=page.locator('article');
    await expect(article).toContainText(credit);
    const image=article.locator(`img[src*="/stories/${photo}."]`).first();
    await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await expect(article.locator('a[href*="commons.wikimedia.org"]')).not.toHaveCount(0);
  }
});
