// host on desktop chromium, phone = iPhone profile on the Safari engine, joining through the decoded QR.
const { chromium, webkit, devices } = require('playwright-core');
const jsQR = require('jsqr');
const assert = require('assert');
const base = process.argv[2];
const shots = process.argv[3];
(async function () {
  const cb = await chromium.launch({ executablePath: process.env.CHROME });
  const host = await (await cb.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await host.goto(base);
  await host.fill('#name', 'damla');
  await host.click('#create');
  await host.waitForSelector('#lobby:not([hidden])', { timeout: 20000 });
  const code = (await host.textContent('#room-code')).trim();

  // read the QR exactly as a camera would: from its pixels.
  const img = await host.evaluate(function () {
    const src = document.getElementById('qr');
    const k = 8;
    const cv = document.createElement('canvas');
    cv.width = (src.width + 8) * k;
    cv.height = (src.height + 8) * k;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 4 * k, 4 * k, src.width * k, src.height * k);
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    return { w: d.width, h: d.height, data: Array.from(d.data) };
  });
  const qr = jsQR(Uint8ClampedArray.from(img.data), img.w, img.h);
  assert(qr, 'QR could not be decoded');
  console.log('QR decodes to: ' + qr.data);
  assert.strictEqual(qr.data, base + '?room=' + code);

  const wb = await webkit.launch(process.env.WEBKIT ? { executablePath: process.env.WEBKIT } : {});
  console.log('phone engine: webkit ' + wb.version());
  const phone = await (await wb.newContext(devices['iPhone 14'])).newPage();
  const errors = [];
  phone.on('pageerror', function (e) { errors.push(e.message); });
  await phone.goto(qr.data);
  await phone.waitForTimeout(1500);
  await phone.screenshot({ path: shots + '/phone-1-join.png' });
  await phone.fill('#name', 'astra');
  await phone.tap('#join');
  await host.waitForFunction(function () { return document.getElementById('slot-1').textContent === 'astra'; }, null, { timeout: 40000 });
  console.log('phone joined the room');
  await phone.screenshot({ path: shots + '/phone-2-lobby.png' });
  await host.click('#start');
  await phone.waitForSelector('#game:not([hidden])', { timeout: 10000 });
  await phone.waitForFunction(function () { const v = window.__idkname.view(); return v && v.players[1].piece; });
  const x0 = await host.evaluate(function () { return window.__idkname.view().players[1].piece.x; });
  await phone.tap('#pad [data-act="L"]');
  await phone.tap('#pad [data-act="L"]');
  await host.waitForFunction(function (x) { const p = window.__idkname.view().players[1].piece; return p && p.x === x - 2; }, x0, { timeout: 5000 });
  console.log('phone touch moves reached the desktop board: x ' + x0 + ' -> ' + (x0 - 2));
  await phone.tap('#pad [data-act="rot"]');
  await phone.tap('#pad [data-act="drop"]');
  await host.waitForFunction(function () { return window.__idkname.view().players[1].locks >= 1; }, null, { timeout: 5000 });
  console.log('phone drop locked a piece on the desktop board');
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: shots + '/phone-3-game.png' });
  const fit = await phone.evaluate(function () {
    const pad = document.getElementById('pad').getBoundingClientRect();
    return { vh: window.innerHeight, vw: window.innerWidth, padBottom: Math.round(pad.bottom), scrollW: document.documentElement.scrollWidth };
  });
  console.log('phone layout: ' + JSON.stringify(fit));
  assert(fit.padBottom <= fit.vh, 'touch pad is cut off below the screen');
  assert(fit.scrollW <= fit.vw, 'page scrolls sideways');
  assert.deepStrictEqual(errors, []);
  await wb.close();
  await cb.close();
  console.log('phone check ok');
})().catch(function (e) {
  console.error('PHONE CHECK FAILED', e.message);
  process.exit(1);
});
