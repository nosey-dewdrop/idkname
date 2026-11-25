// *-*-*-*-*-*-*-*-*-*-*-* two browsers, one room *-*-*-*-*-*-*-*-*-*-*-*
// run: NODE_PATH=<dir with playwright-core>/node_modules node test/e2e.js http://localhost:8765/ <shots dir>

const { chromium } = require('playwright-core');
const assert = require('assert');

const base = process.argv[2];
const shots = process.argv[3];
// RELAY=host:port points every page at a relay running on this machine.
function url(q) {
  const parts = [process.env.RELAY ? 'relay=' + process.env.RELAY : '', q || ''].filter(Boolean);
  return base + (parts.length ? '?' + parts.join('&') : '');
}

(async function () {
  const browser = await chromium.launch(Object.assign({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, process.env.CHROME ? { executablePath: process.env.CHROME } : {}));
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
  await mid.goto(url());
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
    return v && v.players[1].name === 'bot' && v.board.some(function (r) { return r.indexOf(2) !== -1; });
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

  await host.goto(url());
  await host.waitForTimeout(6000);
  await host.screenshot({ path: shots + '/1-home-desktop.png' });
  await host.fill('#name', 'damla');
  await host.click('#create');
  await host.waitForSelector('#lobby:not([hidden])', { timeout: 20000 });
  const code = (await host.textContent('#room-code')).trim();
  assert(/^[A-Z]{4}$/.test(code), 'room code: ' + code);
  console.log('room opened', code);

  await guest.goto(url('room=' + code));
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
  // the partner's piece can stand in the way (a bar next to it cannot step right), so the host steps to the free side.
  const goRight = await host.evaluate(function () {
    const v = window.__idkname.view();
    const p = v.players[0].piece;
    return !window.Engine.hit(v, 0, p.cells, p.x + 1, p.y);
  });
  await host.keyboard.press(goRight ? 'ArrowRight' : 'ArrowLeft');
  await guest.waitForFunction(function (a) { const p = window.__idkname.view().players[0].piece; return p && (a[1] ? p.x > a[0] : p.x < a[0]); }, [h0, goRight], { timeout: 5000 });
  console.log('host input reached the guest board: x moved ' + (goRight ? 'right' : 'left') + ' from ' + h0);

  // *-*-*-*-*-*-*-*-*-*-*-* speed: the guest sees its own move at once; holding down falls fast *-*-*-*-*-*-*-*-*-*-*-*
  const own = await guest.evaluate(function () {
    const x = window.__idkname.view().players[1].piece.x;
    document.querySelector('#pad [data-act="R"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const now = window.__idkname.view().players[1].piece.x;
    document.querySelector('#pad [data-act="R"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return [x, now];
  });
  assert.strictEqual(own[1], own[0] + 1, 'the guest piece moves on its own screen in the same instant');
  await host.waitForFunction(function (x) { const p = window.__idkname.view().players[1].piece; return p && p.x === x; }, own[1], { timeout: 5000 });
  await guest.waitForTimeout(300);
  assert.strictEqual(await guest.evaluate(function () { return window.__idkname.view().players[1].piece.x; }), own[1], 'the host agrees, no snap back');
  const h1 = await host.evaluate(function () { return window.__idkname.heard(); });
  // one sound per drawn frame, so each move waits for its own sound. a box does not turn, so this uses moves only.
  await guest.tap('#pad [data-act="L"]');
  await host.waitForFunction(function (n) { return window.__idkname.heard() >= n + 1; }, h1, { timeout: 5000 });
  await guest.tap('#pad [data-act="R"]');
  await host.waitForFunction(function (n) { return window.__idkname.heard() >= n + 2; }, h1, { timeout: 5000 });
  console.log('host hears the partner piece move');
  const y0 = await host.evaluate(function () { return window.__idkname.view().players[0].piece.y; });
  await host.keyboard.down('ArrowDown');
  await host.waitForTimeout(300);
  await host.keyboard.up('ArrowDown');
  const y1 = await host.evaluate(function () { return window.__idkname.view().players[0].piece.y; });
  assert.ok(y1 - y0 >= 6, 'holding down for 300 ms falls at least 6 rows, fell ' + (y1 - y0));
  console.log('guest move shows at once and holds; down held 300 ms fell ' + (y1 - y0) + ' rows');

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

  // *-*-*-*-*-*-*-*-*-*-*-* voice: one mic on, the other hears; both on, both hear; off again goes quiet *-*-*-*-*-*-*-*-*-*-*-*
  // the browsers run with a fake microphone that beeps, so heard sound can be measured as energy arriving.
  const heardEnergy = function () {
    const pc = window.__idkname.voice().pc;
    if (!pc) { return 0; }
    return pc.getStats().then(function (st) {
      let e = 0;
      st.forEach(function (r) { if (r.type === 'inbound-rtp' && r.kind === 'audio') { e += r.totalAudioEnergy || 0; } });
      return e;
    });
  };
  assert.strictEqual(await host.evaluate(function () { return document.getElementById('legend-mic').hidden; }), false, 'voice key is listed');
  await host.keyboard.press('m');
  await guest.waitForFunction(function () { const v = window.__idkname.voice(); return v.them && v.state === 'connected'; }, null, { timeout: 15000 });
  await guest.waitForFunction(heardEnergy, null, { timeout: 15000 });
  assert.strictEqual(await guest.evaluate(function () { return document.getElementById('mic-note').textContent; }), 'damla is on voice');
  assert.strictEqual(await guest.evaluate(function () { return document.getElementById('voice').paused; }), false, 'the partner voice is playing');
  assert.strictEqual(await host.evaluate(heardEnergy), 0, 'nothing comes back while the guest mic is off');
  await guest.tap('#mic');
  await host.waitForFunction(function () { return window.__idkname.voice().them; }, null, { timeout: 15000 });
  await host.waitForFunction(heardEnergy, null, { timeout: 15000 });
  await host.screenshot({ path: shots + '/5f-voice-desktop.png' });
  await guest.screenshot({ path: shots + '/5f-voice-phone.png' });
  await host.keyboard.press('m');
  await guest.waitForFunction(function () { return !window.__idkname.voice().them; }, null, { timeout: 5000 });
  await guest.waitForTimeout(600);
  const e1 = await guest.evaluate(heardEnergy);
  await guest.waitForTimeout(1500);
  const e2 = await guest.evaluate(heardEnergy);
  assert.ok(e2 - e1 < 1e-6, 'mic off must send no sound, energy grew by ' + (e2 - e1));
  await guest.tap('#mic');
  await host.waitForFunction(function () { return !window.__idkname.voice().them; }, null, { timeout: 5000 });
  console.log('voice: host heard by guest, guest heard by host, mic off is silent');

  // *-*-*-*-*-*-*-*-*-*-*-* camera: each face shows in its own player's card on both screens, and goes away when turned off *-*-*-*-*-*-*-*-*-*-*-*
  const faceLive = function (id) {
    const f = document.getElementById(id);
    return !f.hidden && f.videoWidth > 0 && !f.paused;
  };
  await host.keyboard.press('v');
  await host.waitForFunction(faceLive, 'face-0', { timeout: 15000 });
  await guest.waitForFunction(faceLive, 'face-0', { timeout: 15000 });
  assert.strictEqual(await guest.evaluate(function () { return document.getElementById('face-1').hidden; }), true, 'no face before the guest turns the camera on');
  await guest.tap('#cam');
  await host.waitForFunction(faceLive, 'face-1', { timeout: 15000 });
  await guest.waitForFunction(faceLive, 'face-1', { timeout: 15000 });
  await host.waitForTimeout(500);
  await host.screenshot({ path: shots + '/5g-camera-desktop.png' });
  await guest.screenshot({ path: shots + '/5g-camera-phone.png' });
  await host.keyboard.press('v');
  await guest.waitForFunction(function () { return document.getElementById('face-0').hidden; }, null, { timeout: 5000 });
  await guest.tap('#cam');
  await host.waitForFunction(function () { return document.getElementById('face-1').hidden; }, null, { timeout: 5000 });
  console.log('camera: both faces on both screens, off hides them');

  // *-*-*-*-*-*-*-*-*-*-*-* live table: someone who is not in the room sees this running game on the home screen *-*-*-*-*-*-*-*-*-*-*-*
  const peekCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const peek = await peekCtx.newPage();
  peek.on('pageerror', function (e) { errors.push('peek: ' + e.message); });
  await peek.goto(url());
  const liveRow = function () {
    return Array.from(document.querySelectorAll('#home-scores li.live')).filter(function (li) { return li.textContent.indexOf('damla + astra') !== -1; }).length;
  };
  await peek.waitForFunction(function () {
    return Array.from(document.querySelectorAll('#home-scores li.live')).some(function (li) { return li.textContent.indexOf('damla + astra') !== -1; });
  }, null, { timeout: 45000 });
  assert.strictEqual(await peek.evaluate(liveRow), 1);
  for (const pg of [host, guest]) {
    await pg.waitForTimeout(1000);
    assert.strictEqual(await pg.evaluate(function () {
      return Array.from(document.querySelectorAll('#side-scores li')).filter(function (li) { return li.textContent.indexOf('damla + astra') !== -1; }).length;
    }), 1, 'the running game shows once in its own table');
  }
  await peek.screenshot({ path: shots + '/5e-live-home.png' });
  console.log('a running game shows live on a stranger\'s home screen, once in its own table');

  // *-*-*-*-*-*-*-*-*-*-*-* away: the guest touches nothing, the game pauses on both screens and goes on when they are back *-*-*-*-*-*-*-*-*-*-*-*
  await host.evaluate(function () { window.__idkname.setAway(1500); });
  for (let i = 0; i < 12 && (await host.evaluate(function () { return window.__idkname.away(); })) !== 1; i++) {
    await host.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    await host.waitForTimeout(250);
  }
  assert.strictEqual(await host.evaluate(function () { return window.__idkname.away(); }), 1, 'the idle guest is marked away');
  assert.strictEqual(await host.evaluate(function () { return window.__idkname.paused(); }), true);
  await guest.waitForFunction(function () { return window.__idkname.away() === 1 && !document.getElementById('overlay').hidden; }, null, { timeout: 5000 });
  const awayScore = await host.evaluate(function () { return window.__idkname.view().score; });
  await host.screenshot({ path: shots + '/5d-away-desktop.png' });
  await guest.screenshot({ path: shots + '/5d-away-phone.png' });
  await host.evaluate(function () { window.__idkname.setAway(20000); });
  await guest.tap('#pad [data-act="L"]');
  await host.waitForFunction(function () { return window.__idkname.away() === -1 && !window.__idkname.paused(); }, null, { timeout: 5000 });
  await guest.waitForFunction(function () { return document.getElementById('overlay').hidden; }, null, { timeout: 5000 });
  assert.ok(await host.evaluate(function () { return !window.__idkname.view().over; }), 'being away never ends the game');
  assert.ok((await host.evaluate(function () { return window.__idkname.view().score; })) >= awayScore);
  console.log('idle guest paused the game on both screens, one touch brought it back');

  // *-*-*-*-*-*-*-*-*-*-*-* a third person with the same link watches and cheers *-*-*-*-*-*-*-*-*-*-*-*
  const watchCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const watcher = await watchCtx.newPage();
  watcher.on('pageerror', function (e) { errors.push('watcher: ' + e.message); });
  await watcher.goto(url('room=' + code));
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
  await peek.waitForFunction(function () {
    return !Array.from(document.querySelectorAll('#home-scores li.live')).some(function (li) { return li.textContent.indexOf('damla + astra') !== -1; });
  }, null, { timeout: 60000 });
  console.log('finished game left the live rows');
  await peekCtx.close();
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
  await guest2.goto(url('room=' + code));
  await guest2.tap('#join');
  await guest2.waitForSelector('#game:not([hidden])', { timeout: 30000 });
  await host.waitForFunction(function () { return !window.__idkname.paused(); }, null, { timeout: 5000 });
  console.log('guest came back, game resumed');

  // *-*-*-*-*-*-*-*-*-*-*-* two people who came alone *-*-*-*-*-*-*-*-*-*-*-*
  const aCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const bCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const one = await aCtx.newPage();
  const two = await bCtx.newPage();
  one.on('pageerror', function (e) { errors.push('one: ' + e.message); });
  two.on('pageerror', function (e) { errors.push('two: ' + e.message); });
  await one.goto(url());
  await one.fill('#name', 'ada');
  await one.click('#find');
  await one.waitForSelector('#game:not([hidden])', { timeout: 20000 });
  await one.waitForFunction(function () { return window.__idkname.seeking() && window.__idkname.view().players[1].name === 'bot'; });
  assert.strictEqual(await one.isVisible('#seek-note'), true, 'the open seat note is missing');
  await one.keyboard.press('Space');
  await one.screenshot({ path: shots + '/9-alone-waiting.png' });
  await two.goto(url());
  await two.fill('#name', 'bora');
  await two.waitForFunction(function () { return /1/.test(document.getElementById('seek-count').textContent); }, null, { timeout: 45000 });
  await two.screenshot({ path: shots + '/9-home-count.png' });
  await two.click('#find');
  await two.waitForSelector('#game:not([hidden])', { timeout: 20000 });
  await one.waitForFunction(function () { return window.__idkname.view().players[1].name === 'bora' && !window.__idkname.seeking(); }, null, { timeout: 20000 });
  assert.strictEqual(await two.evaluate(function () { return window.__idkname.role(); }), 'guest');
  assert.strictEqual(await one.isVisible('#seek-note'), false);
  console.log('two people who came alone were put on one board, the second took the bot seat');
  // with a stranger nothing is heard or seen until you turn your own on.
  await one.waitForSelector('#mic:visible');
  await one.click('#mic');
  await two.waitForFunction(function () { const v = window.__idkname.voice(); return v.them && v.state === 'connected'; }, null, { timeout: 20000 });
  assert.strictEqual(await two.evaluate(function () { return window.__idkname.voice().muted; }), true, 'a stranger was heard without asking');
  assert(/ada/.test(await two.textContent('#mic-note')));
  await two.click('#mic');
  await two.waitForFunction(function () { const v = window.__idkname.voice(); return v.mic && !v.muted; });
  await one.click('#cam');
  await two.waitForFunction(function () { return window.__idkname.voice().themCam; }, null, { timeout: 20000 });
  await two.waitForTimeout(1500);
  assert.strictEqual(await two.isVisible('#face-0'), false, 'a stranger was seen without asking');
  await two.click('#cam');
  await two.waitForFunction(function () { return !document.getElementById('face-0').hidden && !document.getElementById('face-1').hidden; }, null, { timeout: 20000 });
  await two.screenshot({ path: shots + '/9-matched.png' });
  console.log('stranger voice and camera stay shut until both sides turn theirs on');
  // the stranger leaves: the game goes on with the bot and the seat is open again.
  await two.close();
  await one.waitForFunction(function () { return window.__idkname.view().players[1].name === 'bot' && window.__idkname.seeking() && !window.__idkname.paused(); }, null, { timeout: 20000 });
  console.log('stranger left, bot sat back down, seat open again');
  await one.close();

  assert.deepStrictEqual(errors, []);
  await browser.close();
  console.log('e2e ok');
})().catch(function (e) {
  console.error('E2E FAILED', e);
  process.exit(1);
});
