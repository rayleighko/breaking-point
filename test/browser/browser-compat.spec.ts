import { expect, test, type Page } from '@playwright/test';

const BASE = '/breaking-point';
const CORE_ROUTES = ['/', '/labs', '/labs/connection-pool', '/topics', '/playground', '/search'];

function watchRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test.describe('브라우저 호환성', () => {
  for (const route of CORE_ROUTES) {
    test(`${route}가 오류 없이 표시됩니다`, async ({ page }) => {
      const errors = watchRuntimeErrors(page);
      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
      await expect(page.locator('main')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('핵심 시뮬레이터를 조작할 수 있습니다', async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await page.goto(`${BASE}/labs/connection-pool`, { waitUntil: 'networkidle' });

    const pause = page.getByRole('button', { name: '⏸ 일시정지' });
    await pause.scrollIntoViewIfNeeded();
    await page.locator('.sim[data-hydrated="true"]').waitFor();
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(page.getByRole('button', { name: '▶ 시작' })).toBeVisible();

    await page.getByRole('button', { name: /커넥션 고갈/ }).click();
    await expect(page.getByText('100%를 넘으면 줄이 무한히 길어집니다')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('검색으로 실험실과 Wiki에 접근할 수 있습니다', async ({ page }) => {
    const errors = watchRuntimeErrors(page);
    await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });

    const input = page.getByRole('searchbox', {
      name: '찾고 싶은 개념이나 문제를 입력해 주세요',
    });
    await input.fill('커넥션 풀');
    const result = page.getByRole('link', { name: /커넥션 풀 고갈/ }).first();
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute('href', new RegExp(`${BASE}/labs/connection-pool/?$`));

    await input.fill('존재하지않는검색어');
    await expect(page.getByText('일치하는 결과가 없습니다.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('한글 조합 중 Enter는 질문을 전송하지 않습니다', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'AI 학습 코치 열기' }).click();

    const input = page.getByRole('textbox', { name: 'AI 학습 코치에게 질문' });
    await input.dispatchEvent('compositionstart', { data: '녕' });
    await input.fill('녕');
    await input.dispatchEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    });

    await expect(input).toHaveValue('녕');
    await expect(page.locator('.pet-message--user')).toHaveCount(0);
  });
});

test.describe('모바일 UX', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  for (const route of ['/', '/labs/connection-pool', '/topics', '/search']) {
    test(`${route}에서 가로 스크롤이 생기지 않습니다`, async ({ page }) => {
      const errors = watchRuntimeErrors(page);
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }

  test('모바일 메뉴와 Pet Coach를 사용할 수 있습니다', async ({ page }) => {
    await page.goto(`${BASE}/labs`, { waitUntil: 'networkidle' });

    const menu = page.getByRole('button', { name: '메뉴' });
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: '모바일 메뉴' })).toBeVisible();

    const coach = page.getByRole('button', { name: /AI 학습 코치 열기/ });
    await coach.click();
    await expect(page.getByRole('dialog', { name: 'AI 학습 코치' })).toBeVisible();

    const panelBounds = await page
      .getByRole('dialog', { name: 'AI 학습 코치' })
      .evaluate((element) => element.getBoundingClientRect().toJSON());
    expect(panelBounds.left).toBeGreaterThanOrEqual(0);
    expect(panelBounds.right).toBeLessThanOrEqual(375);
  });
});
