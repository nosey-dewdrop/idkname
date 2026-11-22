// *-*-*-*-*-*-*-*-*-*-*-* two browsers, one room *-*-*-*-*-*-*-*-*-*-*-*
// run: NODE_PATH=<dir with playwright-core>/node_modules node test/e2e.js http://localhost:8765/ <shots dir>

const { chromium } = require('playwright-core');
const assert = require('assert');

const base = process.argv[2];
const shots = process.argv[3];

(async function () {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const errors = [];
  host.on('pageerror', function (e) { errors.push('host: ' + e.message); });
  guest.on('pageerror', function (e) { errors.push('guest: ' + e.message); });

  // *-*-*-*-*-*-*-*-*-*-*-* alone with the computer, in a 1000px wide window *-*-*-*-*-*-*-*-*-*-*-*
  const midCtx = await browser.newContext({ viewport: { width: 1000, height: 830 } });
  const mid = await midCtx.newPage();
  mid.on('pageerror', function (e) { errors.push('mid: ' + e.message); });
  await mid.goto(base);
  await mid.waitForTimeout(6000);
  await mid.screenshot({ path: shots + '/0-home-1000.png' });
  await mid.fill('#name', 'damla');
  await mid.click('#solo');
  await mid.waitForSelector('#game:not([hidden])');
  await mid.waitForFunction(function () {
    const v = window.__idkname.view();
    return v && v.players[1].name === 'pix' && v.board.some(function (r) { return r.indexOf(2) !== -1; });
  }, null, { timeout: 30000 });
  console.log('computer partner placed a piece');
  for (let i = 0; i < 6; i++) {
    await mid.keyboard.press('ArrowLeft');
    await mid.keyboard.press('Space');
    await mid.waitForTimeout(700);
  }
  await mid.screenshot({ path: shots + '/0-solo-1000.png' });
  await midCtx.close();

  await host.goto(base);
  await host.waitForTimeout(6000);
  await host.screenshot({ path: shots + '/1-home-desktop.png' });
  await host.fill('#name', 'damla');
  await host.click('#create');
  await host.waitForSelector('#lobby:not([hidden])', { timeout: 20000 });
  const code = (await host.textContent('#room-code')).trim();
  assert(/^[A-Z]{4}$/.test(code), 'room code: ' + code);
  console.log('room opened', code);

  await guest.goto(base + '?room=' + code);
  await guest.waitForTimeout(800);
  await guest.screenshot({ path: shots + '/2-join-phone.png' });
  await guest.fill('#name', 'astra');
  await guest.tap('#join');
  await host.waitForFunction(function () { return document.getElementById('slot-1').textContent === 'astra'; }, null, { timeout: 30000 });
  console.log('guest joined, host sees the name');
  await host.screenshot({ path: shots + '/3-lobby-desktop.png' });
  await guest.waitForSelector('#lobby:not([hidden])');
  await guest.screenshot({ path: shots + '/4-lobby-phone.png' });

  await host.click('#start');
  await guest.waitForSelector('#game:not([hidden])', { timeout: 10000 });
  await guest.waitForFunction(function () { const v = window.__idkname.view(); return v && v.players[1].piece; });
  console.log('both in the game');

  // guest moves its own piece left with the touch pad; host must see it.
  const x0 = await host.evaluate(function () { return window.__idkname.view().players[1].piece.x; });
  await guest.tap('#pad [data-act="L"]');
  await guest.tap('#pad [data-act="L"]');
  await host.waitForFunction(function (x) { const p = window.__idkname.view().players[1].piece; return p && p.x === x - 2; }, x0, { timeout: 5000 });
  console.log('guest input reached the host board: x ' + x0 + ' -> ' + (x0 - 2));

  // host moves with the keyboard; guest must see it.
  const h0 = await host.evaluate(function () { return window.__idkname.view().players[0].piece.x; });
  await host.keyboard.press('ArrowRight');
  await guest.waitForFunction(function (x) { const p = window.__idkname.view().players[0].piece; return p && p.x === x + 1; }, h0, { timeout: 5000 });
  console.log('host input reached the guest board: x ' + h0 + ' -> ' + (h0 + 1));

  await host.waitForTimeout(2500);
  await host.screenshot({ path: shots + '/5-game-desktop.png' });
  await guest.screenshot({ path: shots + '/6-game-phone.png' });

  // both drop until the stack tops out; both must see the same final score.
  for (let i = 0; i < 400; i++) {
    await host.keyboard.press('Space');
    await guest.tap('#pad [data-act="drop"]');
    await host.waitForTimeout(30);
    if (await host.evaluate(function () { return window.__idkname.view().over; })) { break; }
  }
  await guest.waitForFunction(function () { return window.__idkname.view().over; }, null, { timeout: 5000 });
  const hs = await host.evaluate(function () { return window.__idkname.view().score; });
  const gs = await guest.evaluate(function () { return window.__idkname.view().score; });
  assert.strictEqual(hs, gs, 'final score differs');
  console.log('game over on both, same score', hs);
  await host.waitForTimeout(300);
  await host.screenshot({ path: shots + '/7-over-desktop.png' });
  await guest.screenshot({ path: shots + '/8-over-phone.png' });

  // rematch, then the guest leaves and comes back with the same code.
  await host.click('#again');
  await guest.waitForFunction(function () { const v = window.__idkname.view(); return v && !v.over; }, null, { timeout: 5000 });
  console.log('rematch started');
  await guest.close();
  await host.waitForFunction(function () { return window.__idkname.paused(); }, null, { timeout: 20000 });
  await host.screenshot({ path: shots + '/9-partner-left-desktop.png' });
  console.log('guest left, host paused');
  const guest2 = await guestCtx.newPage();
  await guest2.goto(base + '?room=' + code);
  await guest2.tap('#join');
  await guest2.waitForSelector('#game:not([hidden])', { timeout: 30000 });
  await host.waitForFunction(function () { return !window.__idkname.paused(); }, null, { timeout: 5000 });
  console.log('guest came back, game resumed');

  assert.deepStrictEqual(errors, []);
  await browser.close();
  console.log('e2e ok');
})().catch(function (e) {
  console.error('E2E FAILED', e);
  process.exit(1);
});
