import {test,expect} from '@playwright/test';
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
  await expect(page).toHaveURL(/doc=chat-metan/);
  await expect(page.locator('article')).toContainText('CH₄ + 2O₂');
});
