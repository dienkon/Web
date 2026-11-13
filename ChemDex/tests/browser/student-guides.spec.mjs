import {test,expect} from '@playwright/test';

test('methanol guide links equilibrium substances and keeps molecular esterification separate from ionic reactions',async({page})=>{
 await page.goto('/trung-tam/tai-lieu-so/metanol-ch4o/');
 const article=page.locator('article');await expect(article).toBeVisible();
 await expect(page.getByRole('heading',{level:1})).toContainText('thành phần, mô hình và phản ứng');
 await expect(article).not.toContainText('Vũ điệu va chạm');await expect(article).not.toContainText('Bản chất ion rút gọn');
 const heading=article.getByRole('heading',{level:3,name:/Este hóa/});
 const equation=heading.locator('xpath=following-sibling::p[1]');
 await expect(equation).toContainText('⇌');expect(await equation.locator('a[href*="/tai-lieu-so/"]').count()).toBeGreaterThanOrEqual(3);
 await expect(equation.locator('a[href*="/lab-3d/"]')).toHaveCount(0);
 await expect(article.locator('.katex .frac-line')).toHaveCount(1);
 await expect(article.locator('.katex-error')).toHaveCount(0);
 await article.locator('details summary').click();await expect(article.locator('details')).toContainText('Theo công thức');
});

test('a generated dossier opens its exact supported experiment and completes observation in the real lab',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/trung-tam/tai-lieu-so/bac-clorua-agcl/');
 const article=page.locator('article');
 const lab=article.locator('a[href="/lab-3d/?experiment=agcl_curdy_precipitation&observe=1"]');
 await expect(lab).toHaveCount(1);
 const equation=article.getByRole('heading',{level:3}).first().locator('xpath=following-sibling::p[1]');
 expect(await equation.locator('a[href*="/tai-lieu-so/"]').count()).toBeGreaterThanOrEqual(4);
 await lab.click();await expect(page).toHaveURL(/agcl_curdy_precipitation&observe=1/);
 const observation=page.getByRole('region',{name:'Quan sát tự động'});await expect(observation).toBeVisible({timeout:60000});
 await expect(observation.getByRole('status')).toContainText('Đã chạy phản ứng',{timeout:35000});
 await page.getByRole('button',{name:'Thông tin bình',exact:true}).click();
 await expect(page.getByText('AgCl',{exact:true}).first()).toBeVisible();
});

test('mobile guides keep peroxide formulas, readable LaTeX and the reader exit available',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/trung-tam/tai-lieu-so/hidro-peoxit-h2o2/');
 await expect(page.getByRole('heading',{level:1})).toContainText('H₂O₂');
 await expect(page.getByRole('heading',{level:1})).not.toContainText('phân tử nước');
 const fraction=page.locator('article .katex .frac-line');await expect(fraction).toHaveCount(1);
 await fraction.scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect((await page.locator('.reader-toolbar').boundingBox()).y).toBe(48);
 await page.locator('.reader-toolbar').getByTitle('Quay lại danh sách tài liệu').click();
 await expect(page.getByRole('heading',{name:'Thư viện nguyên tố và hợp chất',exact:true})).toBeVisible();
});

test('element histories retain primary sources and internal scientist links without attaching a guessed founder to salts',async({page})=>{
 await page.goto('/trung-tam/tai-lieu-so/cacbon-c/');
 const article=page.locator('article');await expect(article).toContainText('Thời cổ đại');
 await expect(article.locator('a[href*="periodic-table.rsc.org"]').first()).toBeVisible();
 await expect(article.getByRole('link',{name:'Antoine Lavoisier',exact:true}).first()).toHaveAttribute('href',/nha-khoa-hoc/);
 await page.goto('/trung-tam/tai-lieu-so/dong-ii-sunfat-cuso4/');
 await expect(page.locator('article')).toContainText('Từ công thức đến sơ đồ thành phần');
 await expect(page.locator('article')).not.toContainText('Dấu ấn nhà khoa học tiên phong');
});
