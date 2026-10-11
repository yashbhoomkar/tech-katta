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


  // Exercise the mobile touch handler in a real Chromium browser with a
  // mobile viewport and touch support. This simulates touch events; it is not
  // a physical-device test.
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePageErrors = [];
  mobilePage.on('pageerror', (error) => mobilePageErrors.push(error.message));

  const swipe = async ({ startX, startY = 420, endX, endY = 420, selector = '.site-main' }) => {
    await mobilePage.evaluate(({ startX, startY, endX, endY, selector }) => {
      if (typeof Touch === 'undefined' || typeof TouchEvent === 'undefined') {
        throw new Error('Chromium does not expose Touch/TouchEvent in the mobile context');
      }
      const target = document.querySelector(selector) || document.body;
      const startTouch = new Touch({
        identifier: 1, target, clientX: startX, clientY: startY,
      });
      const endTouch = new Touch({
        identifier: 1, target, clientX: endX, clientY: endY,
      });
      target.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true, cancelable: true, touches: [startTouch], changedTouches: [startTouch],
      }));
      target.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true, cancelable: true, touches: [], changedTouches: [endTouch],
      }));
    }, { startX, startY, endX, endY, selector });
  };

  const mobileRoute = () => new URL(mobilePage.url()).pathname;
  try {
    await mobilePage.goto(new URL('/', origin).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForSelector('.site-main', { timeout: 15000 });

    await swipe({ startX: 60, endX: 190 });
    await mobilePage.waitForFunction(
      () => document.querySelector('.learning-sidebar')?.classList.contains('is-mobile-open'),
      undefined,
      { timeout: 5000 },
    );
    console.log('PASS mobile-emulated touch: home right swipe opens sidebar');

    await mobilePage.locator('.sidebar-overlay').click();
    await swipe({ startX: 300, endX: 180 });
    if (mobileRoute() !== '/') failures.push('mobile touch: home left swipe unexpectedly changed route');
    if (await mobilePage.locator('.learning-sidebar.is-mobile-open').count()) {
      failures.push('mobile touch: home left swipe unexpectedly opened the sidebar');
    } else {
      console.log('PASS mobile-emulated touch: home left swipe leaves navigation unchanged');
    }

    await mobilePage.goto(new URL('/unit/distributed-systems', origin).toString(), {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await mobilePage.goto(new URL('/learn/distributed-system-components-overview', origin).toString(), {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    await swipe({ startX: 60, endX: 190 });
    await mobilePage.waitForURL((url) => url.pathname === '/unit/distributed-systems', { timeout: 5000 });
    console.log('PASS mobile-emulated touch: article right swipe navigates back');

    await swipe({ startX: 300, endX: 170 });
    await mobilePage.waitForURL((url) => url.pathname === '/learn/distributed-system-components-overview', { timeout: 5000 });
    console.log('PASS mobile-emulated touch: article left swipe navigates forward');

    // Return to home while retaining forward history. Home left swipe must not
    // navigate forward into a previously visited unit.
    await mobilePage.goBack({ waitUntil: 'domcontentloaded' });
    await mobilePage.goBack({ waitUntil: 'domcontentloaded' });
    await mobilePage.waitForURL((url) => url.pathname === '/', { timeout: 5000 });
    await swipe({ startX: 300, endX: 170 });
    await mobilePage.waitForTimeout(300);
    if (mobileRoute() !== '/') {
      failures.push('mobile touch: home left swipe navigated into forward history');
    } else {
      console.log('PASS mobile-emulated touch: home left swipe does not activate forward history');
    }
    await mobilePage.goForward({ waitUntil: 'domcontentloaded' });
    await mobilePage.goForward({ waitUntil: 'domcontentloaded' });
    await mobilePage.waitForURL((url) => url.pathname === '/learn/distributed-system-components-overview', { timeout: 5000 });

    await swipe({ startX: 60, endX: 110 });
    await swipe({ startX: 60, startY: 300, endX: 170, endY: 400 });
    if (mobileRoute() !== '/learn/distributed-system-components-overview') {
      failures.push('mobile touch: short or mostly vertical swipe unexpectedly changed route');
    } else {
      console.log('PASS mobile-emulated touch: short and mostly vertical swipes are ignored');
    }

    await mobilePage.locator('.mobile-sidebar-button').click();
    await mobilePage.waitForFunction(
      () => document.querySelector('.learning-sidebar')?.classList.contains('is-mobile-open'),
      undefined,
      { timeout: 5000 },
    );
    await swipe({ startX: 300, endX: 170 });
    await mobilePage.waitForFunction(
      () => !document.querySelector('.learning-sidebar')?.classList.contains('is-mobile-open'),
      undefined,
      { timeout: 5000 },
    );
    if (mobileRoute() !== '/learn/distributed-system-components-overview') {
      failures.push('mobile touch: left swipe with sidebar open changed the current route');
    } else {
      console.log('PASS mobile-emulated touch: left swipe closes open sidebar without navigation');
    }

    if (mobilePageErrors.length) {
      failures.push(...mobilePageErrors.map((message) => `mobile browser exception: ${message}`));
    }
  } catch (error) {
    failures.push(`mobile-emulated swipe checks failed: ${error.message}`);
  } finally {
    await mobilePage.close();
  }

  if (pageErrors.length) failures.push(...pageErrors.map((message) => `uncaught browser exception: ${message}`));
  // Console errors can include third-party/browser noise; keep them visible for review but fail only on uncaught exceptions.
  if (consoleErrors.length) console.log(`Browser console errors (${consoleErrors.length}):\n- ${consoleErrors.join('\n- ')}`);

  if (failures.length) {
    console.error('Production browser smoke tests FAILED');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('Production browser smoke tests passed: 3 SPA routes + browser-origin API/CORS + mobile-emulated swipe checks + no uncaught page exceptions');
  }
} finally {
  await browser.close();
}
