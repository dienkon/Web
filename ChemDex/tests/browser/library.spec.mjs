import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const subjectLinks=JSON.parse(fs.readFileSync('shared/library-links.generated.json','utf8'));
const libraryRoutes=JSON.parse(fs.readFileSync('shared/library-routes.generated.json','utf8'));
test('chemical stories restore from share URLs and expose structured sections',async({page})=>{
 for(const id of ['chat-nuoc','chat-amoniac','chat-natri-clorua','chat-etanol','chat-carbon-dioxide','chat-metan']){
  await page.goto('/trung-tam/tai-lieu-so/?doc='+id);
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Mục lục bài viết'})).toBeVisible();
  await expect(page.locator('article table')).toHaveCount(1);
  await expect(page.locator('article details')).toHaveCount(1);
  await expect(page.locator('article a[href*="pubchem"]').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('article')).toBeVisible();
 }
});

test('the complete directory reveals batches and opens an ionic dossier from its 3D model',async({page})=>{
  await page.goto('/trung-tam/tai-lieu-so/');
  const results=page.getByRole('region',{name:'Kết quả thư viện'});
  await expect(results.locator('h3')).toHaveCount(24);
  await results.getByRole('button',{name:/Xem thêm tài liệu/}).click();
  await expect(results.locator('h3')).toHaveCount(48);
  await page.goto('/tien-ich/cau-truc-3d/?chemical=chem-cuso4');
  await expect(page.locator('.published-crystal [role=status]')).toHaveAttribute('data-state','ready');
  await page.getByRole('link',{name:/Đọc (?:hồ sơ|tài liệu về) chất ↗/}).click();
  await expect(page).toHaveURL(new RegExp('(?:doc=' + subjectLinks['chem-cuso4'] + '|/tai-lieu-so/' + (libraryRoutes[subjectLinks['chem-cuso4']] ?? 'dong-ii-sulfate-cuso4') + '/)'));
  await expect(page.locator('article')).toContainText('CuSO4');
  await expect(page.locator('article')).toContainText('Từ công thức đến sơ đồ thành phần');
  await expect(page.locator('article details')).toBeVisible();
});

test('representative generated dossiers restore and remain usable on a narrow screen',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const ids=['cid-6360','atom-Og','chem-litmus','chem-universal-indicator','chem-cuso4'];
  for(const id of ids){
    await page.goto('/trung-tam/tai-lieu-so/?doc='+subjectLinks[id]);
    await expect(page.locator('article')).toBeVisible();
    await expect(page.getByRole('navigation',{name:'Mục lục bài viết'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await page.locator('[data-chemical-formula]').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
});

test('library finds chemical stories by accent-free names, aliases and subscript formulas',async({page})=>{
  await page.goto('/trung-tam/tai-lieu-so/');
  const search=page.getByPlaceholder('Tìm kiếm tài liệu Hóa học...');
  const results=page.getByRole('region',{name:'Kết quả thư viện'});
  await search.fill('ethanol');
  await expect(results.locator('h3')).toHaveCount(1);
  await expect(results).toContainText('Etanol');
  await search.fill('H₂O');
  await expect(results.locator('h3')).toHaveCount(1);
  await expect(results).toContainText('Nước');
  await search.fill('khong co chat nay 56789');
  await expect(page.getByRole('heading',{name:'Không tìm thấy tài liệu'})).toBeVisible();
  await search.fill('metan');
  await results.getByRole('heading').click();
  await expect(page).toHaveURL(/(?:doc=chat-metan|\/tai-lieu-so\/metan-ch4\/)/);
  await expect(page.locator('article')).toContainText('CH₄ + 2O₂');
});
