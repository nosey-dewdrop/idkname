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
  // the computer must not play before the human has placed a piece.
  await mid.waitForTimeout(5000);
  assert.strictEqual(await mid.evaluate(function () { return window.__idkname.view().players[1].locks; }), 0, 'computer played before its turn');
  await mid.waitForFunction(function () { return window.__idkname.view().players[0].piece; });
  await mid.keyboard.press('Space');
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
  // difficulty: the button changes the running game, the ? explains it and stays on the screen.
  assert.strictEqual(await mid.evaluate(function () { return window.__idkname.view().diff; }), 1, 'normal is the default');
  await mid.click('#set-help');
  assert((await mid.textContent('#help-box li.on')).startsWith('normal.'));
  await mid.click('#diff');
  assert.strictEqual(await mid.evaluate(function () { return window.__idkname.view().diff; }), 2, 'the button did not reach the game');
  assert((await mid.textContent('#help-box li.on')).startsWith('hard.'));
  const helpFits = await mid.evaluate(function () {
    const r = document.getElementById('help-box').getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });
  assert(helpFits, 'the help panel runs off the screen');
  await mid.screenshot({ path: shots + '/0b-difficulty-help-1000.png' });
  console.log('difficulty button reaches the game, help panel fits');
  await mid.evaluate(function () { localStorage.removeItem('idkname-diff'); });
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

  // *-*-*-*-*-*-*-*-*-*-*-* swap: the guest trades upcoming pieces, both screens agree *-*-*-*-*-*-*-*-*-*-*-*
  const before = await host.evaluate(function () { const v = window.__idkname.view(); return [v.players[0].next.kind, v.players[1].next.kind]; });
  await guest.tap('#pad [data-act="swap"]');
  await host.waitForFunction(function () { return window.__idkname.view().swapN === 1; }, null, { timeout: 5000 });
  const after = await host.evaluate(function () { const v = window.__idkname.view(); return [v.players[0].next.kind, v.players[1].next.kind]; });
  assert.deepStrictEqual(after, [before[1], before[0]]);
  console.log('swap traded next pieces: ' + before.join(' / ') + ' -> ' + after.join(' / '));

  // *-*-*-*-*-*-*-*-*-*-*-* chat: each line shows as a bubble on both boards; typing does not move pieces *-*-*-*-*-*-*-*-*-*-*-*
  const cx = await host.evaluate(function () { return window.__idkname.view().players[0].piece.x; });
  await host.keyboard.press('Enter');
  await host.keyboard.type('add a card here');
  await host.keyboard.press('Enter');
  await guest.waitForFunction(function () { const b = document.getElementById('say-0'); return !b.hidden && b.textContent === 'add a card here'; }, null, { timeout: 5000 });
  assert.strictEqual(await host.evaluate(function () { return window.__idkname.view().players[0].piece.x; }), cx, 'typing in chat must not move the piece');
  assert.strictEqual(await host.evaluate(function () { return document.activeElement.id; }), '', 'sending hands the keys back to the game');
  await guest.fill('#chat-in', 'tamam geliyorum');
  await guest.press('#chat-in', 'Enter');
  await host.waitForFunction(function () { const b = document.getElementById('say-1'); return !b.hidden && b.textContent === 'tamam geliyorum'; }, null, { timeout: 5000 });
  assert.strictEqual(await host.evaluate(function () { return document.querySelectorAll('#chat-log li').length; }), 2);
  await guest.waitForFunction(function () { return !document.getElementById('say-1').hidden; }, null, { timeout: 5000 });
  await host.waitForTimeout(400);
  await host.screenshot({ path: shots + '/5a-chat-desktop.png' });
  await guest.screenshot({ path: shots + '/5a-chat-phone.png' });
  console.log('chat went both ways, bubbles on both boards');

  // *-*-*-*-*-*-*-*-*-*-*-* a third person with the same link watches and cheers *-*-*-*-*-*-*-*-*-*-*-*
  const watchCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const watcher = await watchCtx.newPage();
  watcher.on('pageerror', function (e) { errors.push('watcher: ' + e.message); });
  await watcher.goto(base + '?room=' + code);
  await watcher.fill('#name', 'seyirci');
  await watcher.tap('#join');
  await watcher.waitForSelector('#game:not([hidden])', { timeout: 30000 });
  assert.strictEqual(await watcher.evaluate(function () { return window.__idkname.role(); }), 'watch');
  await host.waitForFunction(function () { return document.getElementById('watching').textContent.indexOf('1') !== -1; }, null, { timeout: 5000 });
  const wx = await host.evaluate(function () { return window.__idkname.view().players[1].piece.x; });
  await watcher.keyboard.press('ArrowLeft');
  await watcher.waitForTimeout(400);
  assert.strictEqual(await host.evaluate(function () { return window.__idkname.view().players[1].piece.x; }), wx, 'a watcher must not move pieces');
  await watcher.tap('#reacts [data-react="0"]');
  await host.waitForSelector('.emote', { timeout: 5000 });
  await guest.waitForSelector('.emote', { timeout: 5000 });
  await watcher.waitForSelector('.emote', { timeout: 5000 });
  console.log('watcher joined, cannot move pieces, cheer shows on all three screens');
  await host.screenshot({ path: shots + '/5b-cheer-desktop.png' });
  await watcher.screenshot({ path: shots + '/5c-watcher-phone.png' });
  await watchCtx.close();
  await host.waitForFunction(function () { return document.getElementById('watching').hidden; }, null, { timeout: 15000 });
  console.log('watcher left, count cleared');

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
