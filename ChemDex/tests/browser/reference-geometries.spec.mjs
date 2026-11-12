import { test, expect } from '@playwright/test';

test('methanol uses NIST hydroxyl geometry, a compact gas-phase note and the geometry paper', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tien-ich/cau-truc-3d/?compound=cid-887');
  const viewer = page.locator('chem-structure-viewer');
  await expect(viewer.locator('.viewer-status')).toContainText('6 nguyên tử · 5 liên kết');
  await expect(viewer.locator('.viewer-source > details.viewer-reference-geometry')).not.toHaveAttribute('open');
  await viewer.getByText('Điều kiện tọa độ · pha khí', { exact: true }).click();
  await expect(viewer.locator('.viewer-reference-geometry')).toContainText('Nhóm đối xứng: Cs');
  await expect(viewer.locator('a[href="https://doi.org/10.1063/1.1742240"]')).toContainText('Methyl Alcohol II');
  // The rotational-constant paper must not be attributed as the source of
  // this geometry: NIST's coordinate rows cite Venkateswarlu/Gordy (1955).
  await expect(viewer.locator('a[href="https://doi.org/10.1016/0022-2852(84)90285-6"]')).toHaveCount(0);
  const geometry = await viewer.evaluate(v => {
    const atoms = v.viewer.getModel().selectedAtoms({});
    const oxygen = atoms.find(a => a.elem === 'O');
    const hydrogen = atoms.find(a => a.elem === 'H' && a.bonds.includes(oxygen.index));
    v.selected = []; v.pick(oxygen); v.pick(hydrogen);
    return { count: atoms.length, distance: Math.hypot(oxygen.x-hydrogen.x, oxygen.y-hydrogen.y, oxygen.z-hydrogen.z) };
  });
  expect(geometry.count).toBe(6); expect(geometry.distance).toBeCloseTo(.956, 3);
  await expect(viewer.locator('.atom-readout')).toContainText('Khoảng cách: 0.956 Å');
  const pending = page.waitForEvent('download');
  await viewer.getByRole('button', { name: 'SDF / CIF ↓', exact: true }).click();
  expect((await pending).suggestedFilename()).toBe('cid-887.sdf');
  expect(errors).toEqual([]);
});

test('NIST benzene remains a planar molecule distinct from its measured crystal', async ({ page }) => {
  await page.goto('/tien-ich/cau-truc-3d/?compound=cid-241');
  const viewer = page.locator('chem-structure-viewer');
  await expect(viewer.locator('.viewer-status')).toContainText('12 nguyên tử · 12 liên kết');
  expect(await viewer.evaluate(v => v.parsedModel.atoms.every(a => a.z === 0))).toBe(true);
  await viewer.getByText('Điều kiện tọa độ · pha khí', { exact: true }).click();
  await expect(viewer.locator('.viewer-reference-geometry')).toContainText('D6h');
  const controls = page.getByRole('group', { name: 'Cách biểu diễn cấu trúc' });
  await controls.getByRole('button', { name: 'Tinh thể', exact: true }).click();
  await expect(viewer).toBeHidden();
  await expect(page.locator('[data-crystal-id="cod-7238223"]')).toBeVisible();
  await controls.getByRole('button', { name: 'Phân tử', exact: true }).click();
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('.viewer-status')).toContainText('12 nguyên tử');
});

test('the library iframe serves the same experimental molecular coordinates on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/trung-tam/tai-lieu-so/metanol-ch4o/');
  await page.getByRole('button', { name: 'Khám phá 3D', exact: true }).click();
  await page.getByRole('group', { name: 'Cách biểu diễn cấu trúc' }).getByRole('button', { name: 'Phân tử', exact: true }).click();
  const viewer = page.frameLocator('.reader-visuals iframe').locator('chem-structure-viewer');
  await expect(viewer.locator('.viewer-status')).toContainText('6 nguyên tử · 5 liên kết');
  await expect(viewer.locator('.viewer-reference-geometry')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('.reader-toolbar')).toBeVisible();
});
