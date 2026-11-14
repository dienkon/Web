import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const primaryRoutes=['/','/?element=N','/?element=Rf','/trung-tam/tai-lieu-so/','/trung-tam/tai-lieu-so/amoniac-nh3/','/tien-ich/','/tien-ich/cau-truc-3d/','/lab-2d/','/lab-3d/','/lab-3d/?view=assets','/lab-safety/','/dau-truong/','/tien-ich/phuong-trinh/chuoi-phan-ung/','/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/'];
const routes=[...new Set([...primaryRoutes,'/on-tap/','/trung-tam/cong-dong/',...JSON.parse(fs.readFileSync('data/features/main.json','utf8')).features.map(feature=>feature.href)])];
for(const width of [320,360,390,768,1366]) {
  test(`all application layouts fit ${width}px and element articles stay within their scroll container`,async({page})=>{
    test.setTimeout(180000);
    await page.setViewportSize({width,height:850});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    for(const route of routes) {
      await page.goto(route);
      await expect(page.locator('#chemdex-sidebar')).toHaveCount(1);
      if(route.includes('element=')) await expect(page.locator('#detail-hero h2')).toBeVisible();
      else if(route.includes('view=assets')) await expect(page.locator('.asset-browser')).toBeVisible();
      else if(await page.locator('#root').count()) await expect(page.locator('#root')).not.toBeEmpty();
      await page.waitForTimeout(500);
      const geometry=await page.evaluate(()=>({window:innerWidth,document:document.documentElement.scrollWidth,content:document.getElementById('content-container')?.scrollWidth,client:document.getElementById('content-container')?.clientWidth}));
      expect(geometry.document,route).toBeLessThanOrEqual(width+1);
      const fullViewport=page.locator('#root > .h-screen, #root > .app-shell, #root > .lab-app, #root > .asset-browser').first();
      if (await fullViewport.count()) expect((await fullViewport.boundingBox()).y+(await fullViewport.boundingBox()).height,route+' height').toBeLessThanOrEqual(851);
      if(route.includes('element=')) {
        await expect(page.locator('#detail-hero h2')).toBeVisible();
        expect(geometry.content,route).toBeLessThanOrEqual(geometry.client+1);
        await expect(page.locator('#element-contents')).not.toHaveAttribute('open','');
        await page.locator('#article-content section').last().scrollIntoViewIfNeeded();
        expect(await page.evaluate(()=>document.getElementById('content-container').scrollLeft),route).toBe(0);
      }
    }
    expect(errors).toEqual([]);
  });
}

test('compact navigation and nested panels open and close on mobile',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/trung-tam/tai-lieu-so/');
  await expect(page.locator('#chemdex-sidebar')).not.toBeInViewport();
  await page.locator('.cd-mobile-toggle').click();
  await expect(page.locator('#chemdex-sidebar')).toBeInViewport();
  await page.locator('.cd-menu-close').click();
  await expect(page.locator('.cd-mobile-toggle')).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'Lọc tài liệu',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Lọc tài liệu'})).toBeVisible();
  await page.getByRole('button',{name:'Đóng bảng',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Lọc tài liệu'})).toHaveCount(0);
  expect(Math.round((await page.locator('header').boundingBox()).y)).toBe(48);
  await page.evaluate(()=>scrollTo(0,500));
  expect(Math.round((await page.locator('header').boundingBox()).y)).toBe(48);
});

test('English labels retain Vietnamese search and actual story filters',async({page})=>{
  await page.goto('/');await expect(page.locator('.el-name')).toContainText(['Hydrogen']);
  await page.locator('#searchInput').fill('luu huynh');await expect(page.locator('#search-results')).toContainText(/sulfur/i);
  await page.goto('/trung-tam/tai-lieu-so/');await page.getByRole('button',{name:'Câu chuyện',exact:true}).click();
  await expect(page.getByRole('region',{name:'Kết quả thư viện'}).locator('h3').first()).toBeVisible();
  await page.goto('/trung-tam/tai-lieu-so/amoniac-nh3/');
  await expect(page.locator('h1')).toContainText(/ammonia/i);
  await expect(page.getByText('Năm 1909, Fritz Haber',{exact:false}).first()).toBeVisible();
  const appendix=page.locator('details').filter({has:page.locator('summary',{hasText:'Tra cứu công thức'})});
  await expect(appendix).not.toHaveAttribute('open','');
  await appendix.locator(':scope > summary').click();await expect(appendix).toHaveAttribute('open','');
});

test('a plain text video service failure shows a helpful message and can be retried',async({page})=>{
  await page.route('**/api/gemini/video-quiz',route=>route.fulfill({status:503,contentType:'text/plain',body:'A server error occurred'}));
  await page.goto('/?element=Na');await page.locator('.video-shell').first().scrollIntoViewIfNeeded();
  const status=page.locator('[data-ai-quiz-status]');
  await expect(status).toContainText('Chưa tải được câu hỏi');
  await expect(status).not.toContainText(/Unexpected|JSON|server error/);
  await page.locator('[data-ai-quiz-retry]').click();await expect(status).toContainText('Chưa tải được câu hỏi');
});

test('laboratory panels start closed and remain available at phone and desktop widths',async({page})=>{
  test.setTimeout(90000);
  for(const width of [360,1366]) {
    await page.setViewportSize({width,height:850});
    await page.goto('/lab-2d/');
    await expect(page.locator('.lab-inventory')).toBeHidden();
    await page.getByRole('button',{name:'Kho dụng cụ',exact:true}).click();
    await expect(page.locator('.lab-inventory')).toBeVisible();
    await page.getByRole('button',{name:'Đóng kho',exact:true}).click();
    await expect(page.locator('.lab-inventory')).toBeHidden();
    await page.goto('/lab-3d/');
    await expect(page.locator('.resizable-sidebar-left')).toHaveCount(0);
    await page.getByTitle('Mở/Đóng danh mục',{exact:true}).click();
    await expect(page.locator('.resizable-sidebar-left')).toBeVisible();
    await page.getByTitle('Mở/Đóng danh mục',{exact:true}).click();
    await expect(page.locator('.resizable-sidebar-left')).toHaveCount(0);
  }
});
