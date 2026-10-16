async (page) => {
  const check = (value, label) => { if (!value) throw new Error(label); };
  const requests = [];
  const errors = [];
  const validCode = 'mock-test-code.';
  let fail = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/auth/v1/**', async route => {
    const req = route.request();
    const body = req.postDataJSON();
    requests.push({ url: req.url(), body });
    const signup = req.url().includes('/signup');
    const rejected = signup && body.data?.beta_code !== validCode;
    await route.fulfill({
      status: fail ? 503 : rejected ? 403 : 200,
      contentType: 'application/json',
      body: JSON.stringify(fail ? { msg: '注册校验暂不可用，请稍后再试；仍可本地使用。' }
        : rejected ? { msg: '内测码无效，请确认后重试；没有内测码也可本地使用。' } : {})
    });
  });
  await page.goto('http://127.0.0.1:4194/index.html');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.locator('#accountStatus').click();
  check(!await page.locator('#authBetaCode').isVisible(), 'login hides beta code');
  await page.locator('#authModeBtn').click();
  await page.locator('#authEmail').fill('test@example.com');
  await page.locator('#authPassword').fill('test-password');
  await page.locator('#authSubmitBtn').click();
  check((await page.locator('#authStatusText').textContent()).includes('请输入内测码'), 'empty code feedback');
  check(requests.length === 0, 'empty code makes no request');
  for (const code of ['wrong-code', 'mock-test-code', 'MOCK-test-code.']) {
    await page.locator('#authBetaCode').fill(code);
    await page.locator('#authSubmitBtn').click();
    await page.waitForFunction(() => document.querySelector('#authStatusText').textContent.includes('内测码无效'));
    check(await page.locator('#authSubmitBtn').isEnabled(), 'retry enabled');
  }
  fail = true;
  await page.locator('#authBetaCode').fill(validCode);
  await page.locator('#authSubmitBtn').click();
  await page.waitForFunction(() => document.querySelector('#authStatusText').textContent.includes('暂不可用'));
  fail = false;
  await page.locator('#authBetaCode').fill(`  ${validCode}  `);
  await page.locator('#authSubmitBtn').click();
  await page.waitForFunction(() => document.querySelector('#authStatusText').textContent.includes('确认邮件已发送'));
  check(requests.at(-1).body.data.beta_code === validCode, 'trimmed code sent with period intact');
  check(await page.locator('#authBetaCode').inputValue() === '', 'success clears code');
  check(!await page.evaluate(code => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(code)), validCode), 'code not persisted');
  await page.locator('#authBetaCode').fill(validCode);
  await page.locator('#authModeBtn').click();
  check(!await page.locator('#authBetaCode').isVisible(), 'return to login hides code');
  check(await page.locator('#authBetaCode').inputValue() === '', 'mode switch clears code');
  await page.locator('#authOtpModeBtn').click();
  await page.locator('#authSendCodeBtn').click();
  await page.waitForFunction(() => document.querySelector('#authStatusText').textContent.includes('验证码邮件已发送'));
  check(requests.at(-1).body.create_user === false, 'OTP cannot create users');
  await page.locator('#authModeBtn').click();
  await page.locator('#authModeBtn').click();
  for (const width of [360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    const box = await page.locator('#authSubmitBtn').boundingBox();
    check(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= (width === 1440 ? 900 : 844), `submit visible at ${width}`);
    check(await page.locator('#authBetaCode').isVisible(), `beta code visible at ${width}`);
  }
  await page.locator('#authCancelBtn').click();
  await page.evaluate(() => { tasks = [{ id: 'beta-local', title: 'Local still works', date: '2026-10-16', category: 'work' }]; persist(); });
  await page.reload();
  check(await page.evaluate(() => tasks.some(task => task.id === 'beta-local')), 'guest tasks survive reload');
  check(errors.length === 0, errors.join(', '));
  console.log('PASS: beta signup validation, error/retry, success/cleanup, OTP restriction, mobile bounds and local data. Mocked APIs only.');
}
