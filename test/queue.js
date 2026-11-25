// two people who came alone: one on desktop chromium, one on an iPhone profile on the Safari engine.
// run: CHROME=<chromium> NODE_PATH=<dir with playwright-core>/node_modules node test/queue.js https://idkname.vercel.app/ <shots dir>
const { chromium, webkit, devices } = require('playwright-core');
const assert = require('assert');
const base = process.argv[2];
const shots = process.argv[3];
(async function () {
  const cb = await chromium.launch({ executablePath: process.env.CHROME });
  const wb = await webkit.launch();
  const errors = [];
  const desk = await (await cb.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const phone = await (await wb.newContext(devices['iPhone 13'])).newPage();
  desk.on('pageerror', function (e) { errors.push('desk: ' + e.message); });
  phone.on('pageerror', function (e) { errors.push('phone: ' + e.message); });
  await phone.goto(base);
  // both must sit in the test line, away from real players.
  assert.strictEqual(await phone.evaluate(function () { return navigator.webdriver; }), true, 'the phone engine is not marked as automated');

  await desk.goto(base);
  await desk.fill('#name', 'ada');
  await desk.click('#find');
  await desk.waitForFunction(function () { return window.__idkname.seeking(); }, null, { timeout: 20000 });
  console.log('desktop came alone: playing with the bot, seat open');

  await phone.fill('#name', 'bora');
  await phone.waitForFunction(function () { return /1/.test(document.getElementById('seek-count').textContent); }, null, { timeout: 45000 });
  await phone.screenshot({ path: shots + '/q-phone-home.png' });
  await phone.tap('#find');
  await phone.waitForSelector('#game:not([hidden])', { timeout: 20000 });
  await desk.waitForFunction(function () { return window.__idkname.view().players[1].name === 'bora' && !window.__idkname.seeking(); }, null, { timeout: 20000 });
  assert.strictEqual(await phone.evaluate(function () { return window.__idkname.role(); }), 'guest');
  console.log('phone (webkit ' + wb.version() + ') was sent to the desktop board and took the bot seat');

  // the phone plays: its piece locks on the desktop board.
  await desk.keyboard.press('Space');
  const locks0 = await desk.evaluate(function () { return window.__idkname.view().players[1].locks; });
  await phone.waitForFunction(function () { const v = window.__idkname.view(); return v && v.players[1].piece; }, null, { timeout: 20000 });
  await phone.tap('#pad [data-act="drop"]');
  await desk.waitForFunction(function (n) { return window.__idkname.view().players[1].locks > n; }, locks0, { timeout: 20000 });
  console.log('phone drop locked a piece on the desktop board');
  await phone.screenshot({ path: shots + '/q-phone-game.png' });
  const fit = await phone.evaluate(function () {
    return { sideways: document.documentElement.scrollWidth - innerWidth, chat: !document.getElementById('chat').hidden, mic: !!document.getElementById('mic').offsetParent };
  });
  assert.strictEqual(fit.sideways, 0, 'the phone page scrolls sideways');
  assert(fit.chat && fit.mic, 'chat or mic missing on the phone');
  console.log('phone layout: ' + JSON.stringify(fit));

  // the desktop leaves: the phone is offered another partner and ends up on its own board with the bot, seat open.
  await desk.close();
  await phone.waitForSelector('#find-again:visible', { timeout: 30000 });
  await phone.screenshot({ path: shots + '/q-phone-host-left.png' });
  await phone.tap('#find-again');
  await phone.waitForFunction(function () { return window.__idkname && window.__idkname.seeking && window.__idkname.seeking() && window.__idkname.role() === 'host'; }, null, { timeout: 30000 });
  assert.strictEqual(await phone.evaluate(function () { const v = window.__idkname.view(); return v.players[0].name + ' + ' + v.players[1].name; }), 'bora + bot');
  await phone.screenshot({ path: shots + '/q-phone-own-board.png' });
  console.log('host left, find someone else put the phone on its own board with the bot, seat open');

  assert.deepStrictEqual(errors, []);
  await cb.close();
  await wb.close();
  console.log('queue check ok');
})().catch(function (e) {
  console.error('QUEUE CHECK FAILED', e);
  process.exit(1);
});
