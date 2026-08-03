import { expect, test } from '@playwright/test';

const BASE = '/breaking-point';

test.describe('브라우저 성능 예산', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    '성능 수치는 Chromium에서만 비교합니다.',
  );

  test('첫 화면의 전송량과 준비 시간을 제한합니다', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const bytes = (matches: (resource: PerformanceResourceTiming) => boolean) =>
        resources.filter(matches).reduce((total, resource) => total + resource.transferSize, 0);

      return {
        domContentLoadedMs: navigation.domContentLoadedEventEnd - navigation.startTime,
        scriptBytes: bytes((resource) => resource.initiatorType === 'script'),
        styleBytes: bytes((resource) => new URL(resource.name).pathname.endsWith('.css')),
        resourceCount: resources.length,
      };
    });

    console.info(`PERF_RESULT ${JSON.stringify(result)}`);
    expect(result.domContentLoadedMs).toBeLessThan(3_000);
    expect(result.scriptBytes).toBeLessThan(500_000);
    expect(result.styleBytes).toBeLessThan(250_000);
    expect(result.resourceCount).toBeLessThan(60);
  });
});
