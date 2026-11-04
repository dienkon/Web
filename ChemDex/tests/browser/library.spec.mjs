import {test,expect} from '@playwright/test';
test('chemical stories restore from share URLs and expose structured sections',async({page})=>{
 for(const id of ['chat-nuoc','chat-amoniac','chat-natri-clorua']){
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
