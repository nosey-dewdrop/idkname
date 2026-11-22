// *-*-*-*-*-*-*-*-*-*-*-* idkname app *-*-*-*-*-*-*-*-*-*-*-*
// screens, drawing, input and the room connection. the host runs the engine, the guest sends moves.

(function () {
  const E = window.Engine;
  const $ = function (id) { return document.getElementById(id); };
  const PEER_PREFIX = 'idkname-room-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  // *-*-*-*-*-*-*-*-*-*-*-* words *-*-*-*-*-*-*-*-*-*-*-*
  const WORDS = {
    en: {
      tagline: 'one board, two players, two pieces falling at once.',
      how: 'open a room, your friend scans the QR, and you stack together. fill a row from wall to wall and it pops.',
      yourName: 'your name', create: 'open a room', haveCode: 'got a code?', join: 'join',
      room: 'room', joinRoom: 'join the room', roomCode: 'room code',
      scan: 'scan the QR with a phone camera, or type the code at this address.',
      copy: 'copy link', copied: 'link copied', waiting: 'waiting for player two', start: 'start',
      score: 'score', level: 'level', lines: 'rows', you: 'you',
      keys: 'arrows or WASD to move, up to turn, space to drop', drop: 'drop', again: 'play again',
      opening: 'opening the room...', joining: 'looking for the room...',
      noRoom: 'no room with that code. check the code and try again.',
      full: 'that room already has two players.',
      netDown: 'could not reach the room service. check your connection and try again.',
      youreIn: 'you are in. the game starts when the host presses start.',
      ready: 'both here. press start.',
      over: 'the stack reached the top', overDetail: '{a} closed {x} rows, {b} closed {y}.',
      waitHost: 'the host can start another round.',
      partnerLeft: 'your partner dropped out', partnerLeftDetail: 'the game is paused. they can come back with the same code: {code}',
      hostLeft: 'connection to the host is lost', hostLeftDetail: 'trying to get back in...',
      localWarn: 'this address only works on this computer. open the site from its network address so a phone can join.'
    },
    tr: {
      tagline: 'tek tahta, iki oyuncu, aynı anda düşen iki parça.',
      how: 'bir oda aç, arkadaşın QR kodu okutsun, birlikte dizin. bir sıra duvardan duvara dolunca patlar.',
      yourName: 'adın', create: 'oda aç', haveCode: 'kodun var mı?', join: 'katıl',
      room: 'oda', joinRoom: 'odaya katıl', roomCode: 'oda kodu',
      scan: 'QR kodu telefon kamerasıyla okut ya da bu adreste kodu yaz.',
      copy: 'bağlantıyı kopyala', copied: 'bağlantı kopyalandı', waiting: 'ikinci oyuncu bekleniyor', start: 'başla',
      score: 'puan', level: 'seviye', lines: 'sıra', you: 'sen',
      keys: 'ok tuşları ya da WASD ile oynat, yukarı çevirir, boşluk bırakır', drop: 'bırak', again: 'tekrar oyna',
      opening: 'oda açılıyor...', joining: 'oda aranıyor...',
      noRoom: 'bu kodla bir oda yok. kodu kontrol edip tekrar dene.',
      full: 'bu odada zaten iki oyuncu var.',
      netDown: 'oda servisine ulaşılamadı. bağlantını kontrol edip tekrar dene.',
      youreIn: 'içeridesin. oda sahibi başlatınca oyun başlar.',
      ready: 'ikiniz de buradasınız. başla.',
      over: 'yığın tepeye ulaştı', overDetail: '{a} {x} sıra kapattı, {b} {y} sıra kapattı.',
      waitHost: 'oda sahibi yeni tur başlatabilir.',
      partnerLeft: 'arkadaşın oyundan düştü', partnerLeftDetail: 'oyun duraklatıldı. aynı kodla geri gelebilir: {code}',
      hostLeft: 'oda sahibiyle bağlantı koptu', hostLeftDetail: 'tekrar girmeye çalışılıyor...',
      localWarn: 'bu adres yalnız bu bilgisayarda çalışır. telefonun katılabilmesi için siteyi ağ adresinden aç.'
    }
  };

  function store(key, value) {
    try {
      if (value === undefined) { return localStorage.getItem(key); }
      localStorage.setItem(key, value);
    } catch (e) { /* private window, fine */ }
    return null;
  }

  let lang = store('idkname-lang') || 'en';
  function t(key, vars) {
    let s = WORDS[lang][key] || WORDS.en[key] || key;
    if (vars) {
      for (const k in vars) { s = s.replace('{' + k + '}', vars[k]); }
    }
    return s;
  }
  function applyWords() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.dataset.locked) { return; }
      el.textContent = t(el.dataset.i18n);
    });
    $('lang').textContent = lang === 'en' ? 'TR' : 'EN';
    refreshOverlay();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* palette *-*-*-*-*-*-*-*-*-*-*-*
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const names = ['board', 'board2', 'p1', 'p1l', 'p1d', 'p2', 'p2l', 'p2d', 'face', 'ink', 'accent'];
    for (const n of names) { C[n] = cs.getPropertyValue('--' + n).trim(); }
  }
  function setPalette(name) {
    document.documentElement.dataset.palette = name;
    store('idkname-palette', name);
    document.querySelectorAll('.swatch').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setPalette === name));
    });
    readColors();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* session *-*-*-*-*-*-*-*-*-*-*-*
  let role = null;        // 'host' | 'guest'
  let me = 0;             // my player index
  let code = '';
  let peer = null;
  let conn = null;        // host: the guest link. guest: the host link.
  let names = ['', ''];
  let state = null;       // host: live engine state
  let view = null;        // what gets drawn (host: state, guest: last snapshot)
  let paused = false;
  let dirty = false;
  let lastSend = 0;
  let simTimer = null;
  let linkLost = false;
  let lastHeard = 0;
  const SILENCE_MS = 4500;

  function myName() {
    const v = $('name').value.trim().slice(0, 12);
    return v || (role === 'guest' ? 'p2' : 'p1');
  }

  function show(id) {
    for (const s of ['home', 'lobby', 'game']) { $(s).hidden = s !== id; }
    if (id === 'game') { fitBoard(); }
    if (id === 'home') { startDemo(); } else { stopDemo(); }
  }

  function randomCode() {
    let s = '';
    for (let i = 0; i < 4; i++) { s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; }
    return s;
  }

  function roomUrl() {
    return location.origin + location.pathname + '?room=' + code;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* host *-*-*-*-*-*-*-*-*-*-*-*
  function hostOpen(tries) {
    role = 'host';
    me = 0;
    code = randomCode();
    names[0] = myName();
    store('idkname-name', $('name').value.trim());
    $('home-status').textContent = t('opening');
    peer = new Peer(PEER_PREFIX + code);
    peer.on('open', function () {
      $('home-status').textContent = '';
      enterLobby();
    });
    peer.on('connection', hostAccept);
    peer.on('disconnected', function () {
      if (peer && !peer.destroyed) { peer.reconnect(); }
    });
    peer.on('error', function (err) {
      if (err.type === 'unavailable-id' && tries < 5) {
        peer.destroy();
        hostOpen(tries + 1);
        return;
      }
      if ($('home').hidden === false) { $('home-status').textContent = t('netDown'); }
    });
  }

  function hostAccept(c) {
    c.on('open', function () {
      if (conn && conn.open && conn !== c) {
        c.send({ t: 'full' });
        setTimeout(function () { c.close(); }, 300);
        return;
      }
      conn = c;
      lastHeard = performance.now();
    });
    c.on('data', function (m) {
      if (c !== conn) { return; }
      lastHeard = performance.now();
      if (m.t === 'hello') {
        names[1] = String(m.name || 'p2').slice(0, 12);
        if (state) {
          state.players[1].name = names[1];
          paused = false;
          dirty = true;
          refreshOverlay();
        }
        sendLobby();
        renderLobby();
      } else if (m.t === 'in' && state && !paused) {
        if (E.input(state, 1, m.a)) { dirty = true; }
      }
    });
    c.on('close', function () { hostDrop(c); });
  }

  function hostDrop(c) {
    if (c !== conn) { return; }
    conn = null;
    names[1] = '';
    if (state && !state.over) { paused = true; }
    renderLobby();
    refreshOverlay();
    try { c.close(); } catch (e) { /* already gone */ }
  }

  function sendLobby() {
    if (conn && conn.open) { conn.send({ t: 'lobby', names: names, playing: !!state }); }
  }

  function sendState(force) {
    const now = performance.now();
    if (!conn || !conn.open || !state) { return; }
    if (!force && now - lastSend < 33) { return; }
    lastSend = now;
    dirty = false;
    conn.send({ t: 'state', s: E.snapshot(state) });
  }

  function hostStart() {
    state = E.newGame(names);
    view = state;
    paused = false;
    show('game');
    refreshOverlay();
    sendState(true);
    if (simTimer) { clearInterval(simTimer); }
    let last = performance.now();
    simTimer = setInterval(function () {
      const now = performance.now();
      const dt = Math.min(100, now - last);
      last = now;
      if (!paused && E.step(state, dt)) { dirty = true; }
      if (dirty) { sendState(false); }
      if (state.over) { refreshOverlay(); }
    }, 16);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* guest *-*-*-*-*-*-*-*-*-*-*-*
  function guestJoin(roomCode) {
    role = 'guest';
    me = 1;
    code = roomCode.toUpperCase();
    store('idkname-name', $('name').value.trim());
    $('home-status').textContent = t('joining');
    if (peer) { peer.destroy(); }
    peer = new Peer();
    peer.on('open', guestConnect);
    peer.on('error', function (err) {
      if (err.type === 'peer-unavailable') {
        if (linkLost) { setTimeout(guestConnect, 1500); return; }
        $('home-status').textContent = t('noRoom');
      } else if ($('home').hidden === false) {
        $('home-status').textContent = t('netDown');
      }
    });
    peer.on('disconnected', function () {
      if (peer && !peer.destroyed) { peer.reconnect(); }
    });
  }

  function guestConnect() {
    const c = peer.connect(PEER_PREFIX + code, { reliable: true });
    c.on('open', function () {
      conn = c;
      linkLost = false;
      lastHeard = performance.now();
      c.send({ t: 'hello', name: myName() });
    });
    c.on('data', function (m) {
      lastHeard = performance.now();
      if (m.t === 'full') {
        $('home-status').textContent = t('full');
        show('home');
      } else if (m.t === 'lobby') {
        names = m.names;
        if (!m.playing) {
          view = null;
          enterLobby();
        }
        refreshOverlay();
      } else if (m.t === 'state') {
        view = m.s;
        if ($('game').hidden) { show('game'); }
        refreshOverlay();
      }
    });
    c.on('close', function () { guestDrop(c); });
  }

  function guestDrop(c) {
    if (c !== conn) { return; }
    conn = null;
    linkLost = true;
    refreshOverlay();
    if ($('lobby').hidden === false) { $('lobby-status').textContent = t('hostLeft'); }
    try { c.close(); } catch (e) { /* already gone */ }
    setTimeout(guestConnect, 1500);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* heartbeat *-*-*-*-*-*-*-*-*-*-*-*
  // a closed tab or a dead phone connection does not always announce itself, so both sides listen for silence.
  setInterval(function () {
    if (!conn || !conn.open) { return; }
    conn.send({ t: 'ping' });
    if (performance.now() - lastHeard > SILENCE_MS) {
      if (role === 'host') { hostDrop(conn); } else { guestDrop(conn); }
    }
  }, 1000);
  window.addEventListener('pagehide', function () {
    if (conn) { conn.close(); }
  });

  // *-*-*-*-*-*-*-*-*-*-*-* lobby *-*-*-*-*-*-*-*-*-*-*-*
  function enterLobby() {
    show('lobby');
    $('room-code').textContent = code;
    const isHost = role === 'host';
    $('lobby-qr').hidden = !isHost;
    $('copy').hidden = !isHost;
    $('start').hidden = !isHost;
    $('lobby-hint').hidden = !isHost;
    if (isHost) {
      drawQr(roomUrl());
      history.replaceState(null, '', location.pathname);
      const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
      $('lobby-status').textContent = local ? t('localWarn') : '';
    }
    renderLobby();
  }

  function renderLobby() {
    $('slot-0').textContent = names[0] || '...';
    const s1 = $('slot-1');
    if (names[1]) {
      s1.textContent = names[1];
      s1.className = '';
      s1.dataset.locked = '1';
    } else {
      delete s1.dataset.locked;
      s1.className = 'waiting';
      s1.textContent = t('waiting');
    }
    if (role === 'host') {
      $('start').disabled = !names[1];
      if (names[1]) { $('lobby-status').textContent = t('ready'); }
    } else {
      $('lobby-status').textContent = t('youreIn');
    }
  }

  function drawQr(text) {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const cv = $('qr');
    cv.width = n;
    cv.height = n;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, n, n);
    ctx.fillStyle = '#1f1530';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (q.isDark(y, x)) { ctx.fillRect(x, y, 1, 1); }
      }
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* overlay (game over, partner gone) *-*-*-*-*-*-*-*-*-*-*-*
  function refreshOverlay() {
    const ov = $('overlay');
    if (!view) {
      ov.hidden = true;
      return;
    }
    if (view.over) {
      ov.hidden = false;
      $('ov-title').textContent = t('over');
      $('ov-score').textContent = String(view.score);
      $('ov-score').hidden = false;
      const d = t('overDetail', {
        a: view.players[0].name, x: view.players[0].lines,
        b: view.players[1].name, y: view.players[1].lines
      });
      $('ov-detail').textContent = role === 'host' ? d : d + ' ' + t('waitHost');
      $('again').hidden = role !== 'host' || !names[1];
    } else if (role === 'host' && paused) {
      ov.hidden = false;
      $('ov-title').textContent = t('partnerLeft');
      $('ov-score').hidden = true;
      $('ov-detail').textContent = t('partnerLeftDetail', { code: code });
      $('again').hidden = true;
    } else if (role === 'guest' && linkLost) {
      ov.hidden = false;
      $('ov-title').textContent = t('hostLeft');
      $('ov-score').hidden = true;
      $('ov-detail').textContent = t('hostLeftDetail');
      $('again').hidden = true;
    } else {
      ov.hidden = true;
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* drawing *-*-*-*-*-*-*-*-*-*-*-*
  let cell = 24;

  function fitBoard() {
    const wrap = $('boardwrap');
    const cv = $('board');
    const availH = wrap.clientHeight - 12;
    const sideRoom = window.innerWidth <= 760 ? 24 : 560;
    const availW = Math.max(200, window.innerWidth - sideRoom);
    cell = Math.max(10, Math.floor(Math.min(availH / E.H, availW / E.W)));
    sizeCanvas(cv, E.W * cell, E.H * cell);
    const small = window.innerWidth <= 760 || matchMedia('(pointer: coarse)').matches;
    document.querySelectorAll('.card .next').forEach(function (n) {
      const u = small ? 9 : 22;
      n._u = u;
      sizeCanvas(n, u * 5, u * 4);
    });
  }

  function sizeCanvas(cv, w, h) {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function block(ctx, x, y, c, owner, face, alpha) {
    const k = owner === 1 ? 'p1' : 'p2';
    const u = Math.max(1, Math.round(c / 8));
    ctx.globalAlpha = alpha || 1;
    ctx.fillStyle = C[k];
    ctx.fillRect(x, y, c, c);
    ctx.fillStyle = C[k + 'l'];
    ctx.fillRect(x, y, c, u);
    ctx.fillRect(x, y, u, c);
    ctx.fillStyle = C[k + 'd'];
    ctx.fillRect(x, y + c - u, c, u);
    ctx.fillRect(x + c - u, y, u, c);
    if (face && c >= 14) {
      ctx.fillStyle = C.face;
      const e = Math.max(2, Math.round(c / 9));
      const ey = y + Math.round(c * 0.36);
      ctx.fillRect(x + Math.round(c * 0.27), ey, e, e + (face === 2 ? -Math.floor(e / 2) : 1));
      ctx.fillRect(x + Math.round(c * 0.73) - e, ey, e, e + (face === 2 ? -Math.floor(e / 2) : 1));
      ctx.fillRect(x + Math.round(c / 2) - e, y + Math.round(c * 0.62), e * 2, Math.max(1, Math.floor(e / 2)));
    }
    ctx.globalAlpha = 1;
  }

  function drawBoard(ctx, s, c, showGhostFor) {
    for (let y = 0; y < E.H; y++) {
      for (let x = 0; x < E.W; x++) {
        ctx.fillStyle = (x + y) % 2 ? C.board : C.board2;
        ctx.fillRect(x * c, y * c, c, c);
      }
    }
    const blink = s.clearing && Math.floor(performance.now() / 65) % 2 === 0;
    for (let y = 0; y < E.H; y++) {
      const going = s.clearing && s.clearing.rows.indexOf(y) !== -1;
      for (let x = 0; x < E.W; x++) {
        const v = s.board[y][x];
        if (!v) { continue; }
        if (going && blink) {
          ctx.fillStyle = C.ink;
          ctx.fillRect(x * c, y * c, c, c);
        } else {
          block(ctx, x * c, y * c, c, v, going ? 2 : 0);
        }
      }
    }
    if (showGhostFor !== null && !s.over) {
      const p = s.players[showGhostFor].piece;
      const gy = E.landing(s, showGhostFor);
      if (p && gy !== null && gy !== p.y) {
        for (const q of p.cells) {
          block(ctx, (p.x + q[0]) * c, (gy + q[1]) * c, c, showGhostFor + 1, 0, 0.22);
        }
      }
    }
    for (let i = 0; i < 2; i++) {
      const p = s.players[i].piece;
      if (!p) { continue; }
      for (let j = 0; j < p.cells.length; j++) {
        block(ctx, (p.x + p.cells[j][0]) * c, (p.y + p.cells[j][1]) * c, c, i + 1, j === 1 ? 1 : 0);
      }
    }
  }

  function drawNext(cv, piece, owner) {
    const ctx = cv.getContext('2d');
    const u = cv._u || 18;
    ctx.fillStyle = C.board;
    ctx.fillRect(0, 0, u * 5, u * 4);
    if (!piece) { return; }
    const sz = E.size(piece.cells);
    const ox = Math.round((u * 5 - sz.w * u) / 2);
    const oy = Math.round((u * 4 - sz.h * u) / 2);
    for (const q of piece.cells) { block(ctx, ox + q[0] * u, oy + q[1] * u, u, owner, 0); }
  }

  function frame() {
    requestAnimationFrame(frame);
    if ($('game').hidden || !view) { return; }
    drawBoard($('board').getContext('2d'), view, cell, me);
    $('hud-score').textContent = view.score;
    $('hud-level').textContent = view.level;
    $('hud-lines').textContent = view.lines;
    for (let i = 0; i < 2; i++) {
      const card = $('card-' + i);
      card.querySelector('.pname').textContent = view.players[i].name;
      card.querySelector('.pl').textContent = view.players[i].lines;
      card.querySelector('.you').hidden = i !== me;
      card.classList.toggle('mine', i === me);
      drawNext(card.querySelector('.next'), view.players[i].next, i + 1);
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* the little demo on the home screen *-*-*-*-*-*-*-*-*-*-*-*
  let demo = null;
  let demoTimer = null;
  const DEMO_MOVES = ['L', 'R', 'rot', 'D', 'D'];

  function startDemo() {
    if (demoTimer) { return; }
    const cv = $('demo');
    const c = Math.max(12, Math.floor(Math.min(window.innerHeight * 0.62 / E.H, (window.innerWidth * 0.42) / E.W, 30)));
    sizeCanvas(cv, E.W * c, E.H * c);
    demo = E.newGame(['', '']);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = 0;
    demoTimer = setInterval(function () {
      n++;
      if (!still || n < 400) {
        if (n % 6 === 0) { E.input(demo, n % 12 === 0 ? 0 : 1, DEMO_MOVES[Math.floor(Math.random() * DEMO_MOVES.length)]); }
        E.step(demo, 40);
        if (demo.over) { demo = E.newGame(['', '']); }
      }
      drawBoard(cv.getContext('2d'), demo, c, null);
    }, 40);
  }
  function stopDemo() {
    if (demoTimer) { clearInterval(demoTimer); }
    demoTimer = null;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* input *-*-*-*-*-*-*-*-*-*-*-*
  function act(a) {
    if (!view || view.over || $('game').hidden) { return; }
    if (role === 'host') {
      if (!paused && E.input(state, 0, a)) { dirty = true; }
    } else if (conn && conn.open) {
      conn.send({ t: 'in', a: a });
    }
  }

  const KEYS = {
    ArrowLeft: 'L', a: 'L', A: 'L',
    ArrowRight: 'R', d: 'R', D: 'R',
    ArrowDown: 'D', s: 'D', S: 'D',
    ArrowUp: 'rot', w: 'rot', W: 'rot', x: 'rot', X: 'rot',
    ' ': 'drop'
  };
  window.addEventListener('keydown', function (ev) {
    if ($('game').hidden) { return; }
    const a = KEYS[ev.key];
    if (!a) { return; }
    ev.preventDefault();
    if (ev.repeat && (a === 'drop' || a === 'rot')) { return; }
    act(a);
  });

  document.querySelectorAll('#pad button').forEach(function (b) {
    let hold = null;
    let rep = null;
    function stop() {
      clearTimeout(hold);
      clearInterval(rep);
      b.classList.remove('down');
    }
    b.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      stop();
      b.classList.add('down');
      const a = b.dataset.act;
      act(a);
      if (a === 'L' || a === 'R' || a === 'D') {
        hold = setTimeout(function () {
          rep = setInterval(function () { act(a); }, 60);
        }, 180);
      }
    });
    for (const n of ['pointerup', 'pointercancel', 'pointerleave']) { b.addEventListener(n, stop); }
    b.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  });

  // *-*-*-*-*-*-*-*-*-*-*-* wiring *-*-*-*-*-*-*-*-*-*-*-*
  $('create').addEventListener('click', function () { hostOpen(0); });
  $('join').addEventListener('click', function () { guestJoin(code); });
  $('join-code').addEventListener('click', function () {
    const v = $('code').value.trim().toUpperCase();
    if (v.length !== 4) {
      $('home-status').textContent = t('noRoom');
      return;
    }
    guestJoin(v);
  });
  $('code').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { $('join-code').click(); }
  });
  $('start').addEventListener('click', hostStart);
  $('again').addEventListener('click', hostStart);
  $('copy').addEventListener('click', function () {
    const done = function () {
      $('copy').textContent = t('copied');
      setTimeout(function () { $('copy').textContent = t('copy'); }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomUrl()).then(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = roomUrl();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    }
  });
  $('lang').addEventListener('click', function () {
    lang = lang === 'en' ? 'tr' : 'en';
    store('idkname-lang', lang);
    applyWords();
    if (!$('lobby').hidden) { renderLobby(); }
  });
  document.querySelectorAll('.swatch').forEach(function (b) {
    b.addEventListener('click', function () { setPalette(b.dataset.setPalette); });
  });
  window.addEventListener('resize', function () {
    if (!$('game').hidden) { fitBoard(); }
  });

  // *-*-*-*-*-*-*-*-*-*-*-* boot *-*-*-*-*-*-*-*-*-*-*-*
  setPalette(store('idkname-palette') || 'candy');
  $('name').value = store('idkname-name') || '';
  const roomParam = (new URLSearchParams(location.search).get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  if (roomParam.length === 4) {
    code = roomParam;
    $('create-box').hidden = true;
    $('join-box').hidden = false;
    $('join-room').textContent = roomParam;
  }
  applyWords();
  show('home');
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(readColors); }
  requestAnimationFrame(frame);
  // read-only peek for the browser test.
  window.__idkname = { view: function () { return view; }, paused: function () { return paused; } };
})();
