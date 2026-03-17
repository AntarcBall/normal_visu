import { test, expect } from '@playwright/test';

async function stabilizePage(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}

async function setRangeValue(locator, value) {
  await locator.evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await stabilizePage(page);
  await expect(page.getByRole('heading', { name: 'ITSC 이상탐지 학습 플레이그라운드' })).toBeVisible();
});

test('new whole.md pages have no katex rendering errors', async ({ page }) => {
  const pageButtons = ['데이터 계층', '정규화 설계', '블록 후보', '채널/시점'];

  for (const button of pageButtons) {
    await page.getByRole('button', { name: button }).click();
    await expect(page.locator('.katex-error')).toHaveCount(0);
  }
});

test('whole structure page renders organized hierarchy formulas', async ({ page }) => {
  await page.getByRole('button', { name: '데이터 계층' }).click();
  await expect(page.getByText(/데이터 계층과 윈도우 샘플/)).toBeVisible();
  await page.getByRole('button', { name: 'Cluster' }).click();
  await expect(page.getByText('Hierarchy drill-down')).toBeVisible();
  await expect(page.getByTestId('whole-structure-hierarchy-card')).toHaveScreenshot('whole-structure-page.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('normalization design page switches family cards cleanly', async ({ page }) => {
  await page.getByRole('button', { name: '정규화 설계' }).click();
  await page.getByRole('button', { name: 'Max-abs' }).click();
  await page.getByRole('button', { name: 'Window-local' }).click();
  await page.getByRole('button', { name: 'Sample-wise' }).click();
  await expect(page.getByText('Tensor abstraction')).toBeVisible();
  await expect(page).toHaveScreenshot('whole-normalization-design-page.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('normalization blocks page shows block tradeoff cards', async ({ page }) => {
  await page.getByRole('button', { name: '블록 후보' }).click();
  await page.getByRole('button', { name: 'Frequency-domain' }).click();
  await expect(page.getByText(/L\. Frequency-bin-wise, instance\/window/).first()).toBeVisible();
  await expect(page.getByText('All candidates').first()).toBeVisible();
  await expect(page).toHaveScreenshot('whole-normalization-blocks-page.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('channel timing page shows timing and no-normalization candidates', async ({ page }) => {
  await page.getByRole('button', { name: '채널/시점' }).click();
  await page.getByRole('button', { name: 'No normalization' }).click();
  await page.getByRole('button', { name: 'High overlap' }).click();
  await expect(page.getByText(/무정규화 후보/)).toBeVisible();
  await expect(page.getByTestId('channel-timing-all-candidates-card')).toHaveScreenshot('whole-channel-timing-page.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('cycle window section responds to controls and matches visual baseline', async ({ page }) => {
  await page.getByRole('button', { name: '사이클 윈도우' }).click();
  await page.getByRole('button', { name: '32' }).click();
  await page.getByRole('button', { name: '정상 파형' }).click();
  await setRangeValue(page.locator('input[type="range"]').first(), 75);

  await expect(page.getByText('Fault ON')).toBeVisible();
  await expect(page).toHaveScreenshot('cycle-window-interaction.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('normalization section toggles scaler and joint normalization view', async ({ page }) => {
  await page.getByRole('button', { name: '채널별 정규화' }).click();
  await page.getByRole('button', { name: 'RobustScaler' }).click();
  await page.getByRole('button', { name: /공동 \(Joint\)/ }).click();
  await page.getByRole('button', { name: '정상 파형' }).click();

  await expect(page.getByText('공동 RobustScaler 적용 후')).toBeVisible();
  await expect(page).toHaveScreenshot('normalization-joint-robust.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('dual-view section shows branch separation under severe heavy-load fault', async ({ page }) => {
  await page.getByRole('button', { name: 'Dual-View' }).click();
  await page.getByRole('button', { name: 'Severe fault' }).click();
  await page.getByRole('button', { name: 'Heavy load' }).click();
  await setRangeValue(page.locator('input[type="range"]').first(), 90);

  await expect(page.getByRole('heading', { name: 'Amplitude-preserving branch' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shape branch' })).toBeVisible();
  await expect(page).toHaveScreenshot('dual-view-severe-heavy.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});

test('data map section updates selected slice and split explanation', async ({ page }) => {
  await page.getByRole('button', { name: '데이터 구조' }).click();
  await page.getByRole('button', { name: '45Hz', exact: true }).click();
  await page.getByRole('button', { name: 'Class 5', exact: true }).click();
  await page.getByRole('button', { name: '100%', exact: true }).click();

  await expect(page.getByText('Filename preview')).toBeVisible();
  await expect(page.getByText(/5_cSampleIdx_c45_c100/)).toBeVisible();
  await expect(page).toHaveScreenshot('data-map-class5-100hz.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});
