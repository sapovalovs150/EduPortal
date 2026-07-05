import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs', 'screenshots');
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8099';
const roomUrl = `${baseUrl}/--/room/${process.env.E2E_ROOM || '407'}?building=${encodeURIComponent(process.env.E2E_BUILDING || '5')}`;

const TEXT = {
  schedule: '\u0420\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435',
  busy: '\u0417\u0430\u043d\u044f\u0442\u043e',
  free: '\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u043e',
  room: '\u0410\u0443\u0434.',
  book: '\u0417\u0430\u0431\u0440\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c',
};

await mkdir(outDir, { recursive: true });

async function openRoom(page, width, height, name) {
  await page.setViewportSize({ width, height });
  let body = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    if (body.includes(TEXT.schedule) || body.includes(TEXT.busy) || body.includes(TEXT.free) || body.includes(TEXT.room)) break;
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: resolve(outDir, name), fullPage: true });
  if (!body.includes(TEXT.schedule) && !body.includes(TEXT.busy) && !body.includes(TEXT.free) && !body.includes(TEXT.room)) {
    throw new Error(`Room display did not render expected tablet text. Body: ${body.slice(0, 300)}`);
  }
}

async function checkPinModal(page) {
  const bookingButton = page.getByText(TEXT.book).first();
  if ((await bookingButton.count()) === 0) return;
  await bookingButton.click();
  await page.waitForTimeout(700);
  const input = page.locator('input').first();
  await input.fill('1234');
  await page.waitForTimeout(300);
  const box = await input.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('PIN input is not visible');
  if (box.y < 0 || box.y + box.height > viewport.height) {
    throw new Error(`PIN input is outside viewport: ${JSON.stringify(box)} in ${JSON.stringify(viewport)}`);
  }
  await page.screenshot({ path: resolve(outDir, 'tablet_pin_phone_320x568.png'), fullPage: true });
}

async function openBookingIfPinExists(page) {
  const activePin = process.env.E2E_PIN;
  if (!activePin) {
    console.log('BOOKING_CHECK_SKIPPED_NO_E2E_PIN');
    return;
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.getByText('Забронировать').first().click();
  await page.waitForTimeout(500);
  await page.locator('input').first().fill(activePin);
  await page.getByText('Войти').first().click();
  await page.waitForTimeout(7000);
  const body = await page.locator('body').innerText({ timeout: 5000 });
  await page.screenshot({ path: resolve(outDir, 'tablet_booking_phone_320.png'), fullPage: true });
  if (!body.includes('Бронирование')) throw new Error(`Booking screen did not open. Body: ${body.slice(0, 300)}`);
  if (/(Ð|вЂ|�|Р[ЉџќћњЎЇ¤ђ“”]|С[ЃЊ‹Џњ])/.test(body)) {
    throw new Error(`Booking screen contains mojibake. Body: ${body.slice(0, 500)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (error) => errors.push(String(error)));

await openRoom(page, 1240, 700, 'tablet_display_wide_1240.png');
await openRoom(page, 768, 420, 'tablet_display_compact_768.png');
await openRoom(page, 320, 568, 'tablet_display_phone_320.png');
await checkPinModal(page);
await openBookingIfPinExists(page);

console.log('TABLET_WEB_CHECK_OK');
if (errors.length) {
  console.log('BROWSER_ERRORS_START');
  for (const error of errors.slice(0, 10)) console.log(error);
  console.log('BROWSER_ERRORS_END');
}

await browser.close();
