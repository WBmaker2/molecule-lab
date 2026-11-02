import { expect, test } from '@playwright/test';

test('mobile layout keeps navigation and the formula bar visible without overflow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
  await expect(page.getByRole('button', { name: '퀴즈' })).toBeVisible();
  await expect(page.locator('.formula-bar')).toBeVisible();

  const buildOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(buildOverflow).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: '상태변화' }).click();
  await expect(page.getByRole('heading', { name: '온도가 입자 운동을 바꿉니다' })).toBeVisible();
  const statesOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(statesOverflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.formula-bar')).toBeVisible();
  await expect(page.locator('.stage-shell')).toBeVisible();

  await page.getByRole('button', { name: '분자 도감' }).click();
  await expect(page.getByRole('heading', { name: '12개의 분자 표본을 만나 보세요' })).toBeVisible();
  const libraryOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(libraryOverflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.specimen-card')).toHaveCount(12);
});
