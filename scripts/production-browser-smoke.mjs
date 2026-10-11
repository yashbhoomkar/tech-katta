const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const origin = process.env.FRONTEND_URL ?? 'https://tech.katta.cc';
const apiOrigin = process.env.API_URL ?? 'https://tech-api.katta.cc';
const failures = [];
const pageErrors = [];
const consoleErrors = [];
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const routes = [
    { path: '/', label: 'home', expectedTitle: /Tech Katta/i },
    { path: '/unit/distributed-systems', label: 'distributed systems unit' },
    { path: '/learn/distributed-system-components-overview', label: 'canonical article' },
  ];

  for (const route of routes) {
    const response = await page.goto(new URL(route.path, origin).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (!response || response.status() !== 200) {
      failures.push(`${route.label}: expected HTTP 200, got ${response?.status() ?? 'no response'}`);
      continue;
    }

    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      return Boolean(root && root.children.length > 0 && root.innerText.trim().length > 20);
    }, { timeout: 15000 }).catch(() => {
      failures.push(`${route.label}: React root did not render meaningful content`);
    });

    if (route.expectedTitle && !route.expectedTitle.test(await page.title())) {
      failures.push(`${route.label}: unexpected document title ${JSON.stringify(await page.title())}`);
    }

    const textLength = await page.locator('#root').innerText().then((text) => text.trim().length).catch(() => 0);
    if (textLength < 20) failures.push(`${route.label}: rendered content is unexpectedly short (${textLength} chars)`);
    console.log(`PASS browser route: ${route.label} (HTTP ${response.status()}, rendered chars=${textLength})`);
  }

  // Exercise the API from the real browser origin so browser CORS rules apply.
  const apiCheck = await page.evaluate(async (url) => {
    const response = await fetch(url);
    return { status: response.status, body: await response.json() };
  }, `${apiOrigin}/api/articles/distributed-system-components-overview`).catch((error) => ({
    error: error.message,
  }));

  if (apiCheck.error) {
    failures.push(`browser-origin API request failed: ${apiCheck.error}`);
  } else if (apiCheck.status !== 200 || apiCheck.body?.slug !== 'distributed-system-components-overview' ||
             !Array.isArray(apiCheck.body?.content?.sections)) {
    failures.push(`browser-origin API contract failed: HTTP ${apiCheck.status}`);
  } else {
    console.log('PASS browser-origin API request + canonical article contract');
  }

  if (pageErrors.length) failures.push(...pageErrors.map((message) => `uncaught browser exception: ${message}`));
  // Console errors can include third-party/browser noise; keep them visible for review but fail only on uncaught exceptions.
  if (consoleErrors.length) console.log(`Browser console errors (${consoleErrors.length}):\n- ${consoleErrors.join('\n- ')}`);

  if (failures.length) {
    console.error('Production browser smoke tests FAILED');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('Production browser smoke tests passed: 3 SPA routes + browser-origin API/CORS + no uncaught page exceptions');
  }
} finally {
  await browser.close();
}
