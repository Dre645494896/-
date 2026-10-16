async (page) => {
  const errors = [];
  const check = (ok, label) => { if (!ok) throw new Error(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://dre645494896.github.io/-/');
  await page.locator('#accountStatus').click();
  await page.locator('#authModeBtn').click();
  await page.locator('#authEmail').fill(`beta-live-${Date.now()}@example.com`);
  await page.locator('#authPassword').fill(`Disposable-${Date.now()}`);
  await page.locator('#authSubmitBtn').click();
  check((await page.locator('#authStatusText').textContent()).includes('请输入内测码'), 'live empty code feedback');
  await page.locator('#authBetaCode').fill('invalid-live-test-code');
  const response = page.waitForResponse(res => res.url().includes('/auth/v1/signup'));
  await page.locator('#authSubmitBtn').click();
  check((await response).status() === 403, 'real API rejects incorrect code');
  await page.waitForFunction(() => document.querySelector('#authStatusText').textContent.includes('内测码无效'));
  await page.locator('#authBetaCode').fill('');
  await page.screenshot({ path: 'output/playwright/beta-live-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await page.locator('#authSubmitBtn').boundingBox();
  check(bounds && bounds.y + bounds.height <= 844, 'live mobile submit reachable');
  await page.screenshot({ path: 'output/playwright/beta-live-mobile.png' });
  check(errors.length === 0, errors.join(', '));
  return { passed: true, scope: 'live signup form, missing-code validation, real server rejection, desktop/mobile bounds, no page errors; no successful signup or email in this test' };
}
