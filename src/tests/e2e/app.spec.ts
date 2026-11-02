import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Molecule Lab', () => {
  test('assembles H2O with the bond helper and reports the 104.5 degree angle', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await expect(page.getByTestId('formula-current')).toHaveText('H₂O');
    await expect(page.getByTestId('formula-verdict')).toContainText('물 완성!');

    await page.getByRole('button', { name: '목표 새로 조립' }).click();
    await expect(page.getByTestId('formula-verdict')).toContainText('결합이 2개 더 필요해요');

    await page.getByRole('button', { name: '수소 1 원자와 결합' }).click();
    await expect(page.getByTestId('formula-verdict')).toContainText('결합이 1개 더 필요해요');
    await page.getByRole('button', { name: '수소 2 원자와 결합' }).click();

    await expect(page.getByTestId('formula-current')).toHaveText('H₂O');
    await expect(page.getByTestId('formula-verdict')).toContainText('물 완성!');
    await expect(page.getByTestId('target-progress')).toContainText('H 2/2');
    await expect(page.getByTestId('target-progress')).toContainText('O 1/1');
    await expect(page.locator('.angle-list')).toContainText('104.5°');
    expect(pageErrors).toEqual([]);
  });

  test('undoes and redoes workbench edits with buttons and keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await page.getByRole('button', { name: '실험대 비우기' }).click();
    await page.getByRole('button', { name: '수소 원자 추가' }).click();
    await expect(page.locator('.stage-count')).toContainText('원자 1');
    await page.getByRole('button', { name: '실행 취소' }).click();
    await expect(page.locator('.stage-count')).toContainText('원자 0');
    await page.keyboard.press('Control+Shift+Z');
    await expect(page.locator('.stage-count')).toContainText('원자 1');
  });

  test('switches drag mode and measures atom distance', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await page.getByRole('button', { name: '회전', exact: true }).click();
    await expect(page.getByRole('button', { name: '회전', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: '이동', exact: true }).click();
    await page.getByTestId('measure-select').selectOption({ index: 1 });
    await expect(page.getByTestId('measure-result')).toContainText(/\d+\.\d+/);
  });

  test('runs the 1,500-particle states simulation across all phases', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#states');
    await expect(page.getByRole('heading', { name: '온도가 입자 운동을 바꿉니다' })).toBeVisible();

    const temperatureSlider = page.getByLabel('온도 (섭씨)');
    await temperatureSlider.focus();
    await page.keyboard.press('End');
    await expect(page.locator('.state-summary')).toContainText('기체');
    await expect(page.locator('.state-summary')).toContainText('120');

    await page.locator('.particle-quick').getByRole('button', { name: '1,500' }).click();
    await expect(page.locator('.state-summary')).toContainText('1,500');
    await expect(page.locator('.stage-heading')).toContainText('1,500');
    await expect(page.locator('.stage-count')).toContainText(/\d+ fps/);
    await expect(page.locator('.sim-metrics')).not.toContainText('NaN');

    await temperatureSlider.focus();
    await page.keyboard.press('Home');
    await expect(page.locator('.state-summary')).toContainText('고체');
    await expect(page.locator('.phase-overlay')).toContainText('고체');

    await page.waitForTimeout(700);
    const fps = await page.locator('.sim-metrics').innerText();
    expect(fps).toMatch(/\d+ fps/);
    expect(pageErrors).toEqual([]);
  });

  test('plays both reaction scenes to completion without NaN', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#reactions');
    await expect(
      page.getByRole('heading', { name: '이온이 만나 새로운 물질이 됩니다' }),
    ).toBeVisible();

    await page.getByRole('button', { name: '2×', exact: true }).click();
    await page.getByRole('button', { name: '반응 재생' }).click();
    await expect(page.getByTestId('reaction-complete')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('reaction-progress')).toHaveAttribute('data-progress', '1.000');

    await page.locator('[data-testid="reaction-precipitation"]').click();
    await expect(page.getByRole('heading', { name: '앙금 생성 반응', level: 3 })).toBeVisible();
    await page.getByRole('button', { name: '반응 재생' }).click();
    await expect(page.getByTestId('reaction-complete')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('reaction-progress')).toHaveAttribute('data-progress', '1.000');
    await expect(page.locator('body')).not.toContainText(/\bNaN\b/);
    expect(pageErrors).toEqual([]);
  });

  test('filters the library, opens a specimen dialog, and starts a guided build', async ({
    page,
  }) => {
    await page.goto('/#library');
    await expect(
      page.getByRole('heading', { name: '12개의 분자 표본을 만나 보세요' }),
    ).toBeVisible();
    await expect(page.locator('.specimen-card')).toHaveCount(12);

    await page.getByRole('button', { name: /연소·기체/ }).click();
    await expect(page.locator('.specimen-card')).toHaveCount(5);
    await page.getByRole('button', { name: /^전체/ }).click();
    await expect(page.locator('.specimen-card')).toHaveCount(12);

    await page
      .locator('[data-testid="molecule-h2o"]')
      .getByRole('button', { name: /자세히/ })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /물/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page
      .locator('[data-testid="molecule-h2o"]')
      .getByRole('button', { name: '따라 만들기' })
      .click();
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await expect(page.getByTestId('formula-verdict')).toContainText('결합이 2개 더 필요해요');
  });

  test('completes the five-question structure quiz', async ({ page }) => {
    await page.goto('/#quiz');
    await expect(
      page.getByRole('heading', { name: '구조를 보고 이름을 맞혀 보세요' }),
    ).toBeVisible();

    for (let index = 0; index < 5; index += 1) {
      await page.locator('.quiz-option').first().click();
      await expect(page.locator('.quiz-feedback')).not.toContainText('보기에서 이름을 골라 주세요');
      const nextLabel = index === 4 ? '결과 보기' : '다음 문제';
      await page.getByRole('button', { name: nextLabel }).click();
    }

    await expect(page.getByText('퀴즈 완료')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 풀기' })).toBeVisible();
    await expect(page.getByTestId('quiz-best')).toContainText('최고');
    await expect(page.locator('body')).not.toContainText(/\bNaN\b/);
  });
});

  test('loads teacher preset deep links', async ({ page }) => {
    await page.goto('/#/build?target=co2&mode=target');
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await expect(page.getByTestId('formula-verdict')).toContainText('결합이 2개 더 필요해요');

    await page.goto('/#/states?temp=112&count=1500');
    await expect(page.locator('.state-summary')).toContainText('기체');
    await expect(page.locator('.state-summary')).toContainText('1,500');

    await page.goto('/#/reactions/precipitation?t=1');
    await expect(page.getByTestId('reaction-complete')).toBeVisible();
    await expect(page.getByTestId('reaction-progress')).toHaveAttribute('data-progress', '1.000');

    await page.goto('/#/quiz?seed=7');
    await expect(page.getByTestId('quiz-index')).toContainText('문제 1');
    await expect(page).toHaveURL(/seed=7/);

    await page.goto('/#/worksheet?molecule=h2o');
    await expect(page.getByRole('heading', { name: /관찰 기록지/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '인쇄하기' })).toBeVisible();

    await page.goto('/#/library?collection=ions');
    await expect(page.locator('.specimen-card')).toHaveCount(11);
  });

  test('completes the new precipitation scenes from the timeline', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#reactions');
    await expect(
      page.getByRole('heading', { name: '이온이 만나 새로운 물질이 됩니다' }),
    ).toBeVisible();
    for (const testId of ['reaction-barium-sulfate', 'reaction-lead-iodide']) {
      await page.locator(`[data-testid="${testId}"]`).click();
      const scrubber = page.locator('#reaction-progress-range');
      await scrubber.focus();
      await page.keyboard.press('End');
      await expect(page.getByTestId('reaction-complete')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('body')).not.toContainText(/\bNaN\b/);
    }
    expect(pageErrors).toEqual([]);
  });

  test('renders a safe-mode fallback without WebGL', async ({ page }) => {
    await page.goto('/#/states?safe=1');
    await expect(page.getByTestId('webgl-fallback')).toBeVisible();
    await expect(page.locator('.state-summary')).toContainText('24');
  });

  test('loads offline from the service worker cache', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: '분자를 직접 조립하세요' })).toBeVisible({
      timeout: 15_000,
    });
  });

test('has no WCAG A/AA violations across the main views', async ({ page }) => {
  for (const route of ['', '/#states', '/#reactions', '/#library', '/#quiz']) {
    await page.goto(route || '/');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, `${route || '/'} accessibility violations`).toEqual([]);
  }
});
