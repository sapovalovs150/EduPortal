import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs', 'screenshots');
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8099';
await mkdir(outDir, { recursive: true });

async function openApp(page, width, height) {
  await page.setViewportSize({ width, height });
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
      const text = await page.locator('body').innerText({ timeout: 5000 });
      if (text.includes('EduPortal') || text.includes('Расписание')) return;
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(4000);
  }
  if (lastError) throw lastError;
}

async function signInAsStudent(page) {
  const inputs = page.locator('input');
  console.log(`INPUT_COUNT ${await inputs.count()}`);
  if ((await inputs.count()) > 0) {
    await inputs.first().fill('КБ-252');
  }
  const enterButton = page.getByText('Войти', { exact: true }).first();
  console.log(`ENTER_COUNT ${await enterButton.count()}`);
  if (await enterButton.count()) {
    await enterButton.click();
    await page.waitForTimeout(7000);
  }
}

async function snapshot(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (error) => errors.push(String(error)));

await openApp(page, 360, 740);
console.log('BEFORE_LOGIN_START');
console.log((await page.locator('body').innerText({ timeout: 5000 })).slice(0, 600));
console.log('BEFORE_LOGIN_END');
await signInAsStudent(page);
console.log('AFTER_LOGIN_START');
console.log((await page.locator('body').innerText({ timeout: 5000 })).slice(0, 600));
console.log('AFTER_LOGIN_END');
await snapshot(page, 'calendar_mobile_360.png', 360, 740);
await snapshot(page, 'calendar_small_320.png', 320, 568);
await snapshot(page, 'calendar_tiny_280.png', 280, 560);
await snapshot(page, 'calendar_tiny_240.png', 240, 520);
await snapshot(page, 'calendar_wide_1240.png', 1240, 520);
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(800);
await page.mouse.click(160, 92);
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(outDir, 'calendar_expanded_320.png'), fullPage: true });
await page.setViewportSize({ width: 280, height: 560 });
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(outDir, 'calendar_expanded_280.png'), fullPage: true });
await page.setViewportSize({ width: 1240, height: 620 });
await page.waitForTimeout(800);
await page.screenshot({ path: resolve(outDir, 'calendar_expanded_wide_1240.png'), fullPage: true });

const bodyText = await page.locator('body').innerText({ timeout: 5000 });
console.log('BODY_TEXT_START');
console.log(bodyText.slice(0, 1200));
console.log('BODY_TEXT_END');
console.log('ERRORS_START');
for (const error of errors.slice(0, 20)) {
  console.log(error);
}
console.log('ERRORS_END');

await browser.close();
