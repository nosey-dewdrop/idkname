// *-*-*-*-*-*-*-*-*-*-*-* idkname app *-*-*-*-*-*-*-*-*-*-*-*
// screens, drawing, sound, input and the room connection.
// the host runs the engine, the guest sends moves, the computer partner is just another hand on the host.

(function () {
  const E = window.Engine;
  const Bot = window.Bot;
  const $ = function (id) { return document.getElementById(id); };
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const BOT_NAME = 'pix';
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // *-*-*-*-*-*-*-*-*-*-*-* words *-*-*-*-*-*-*-*-*-*-*-*
  const WORDS = {
    en: {
      yourName: 'your name', create: 'play with a friend', solo: 'play with the computer',
      haveCode: 'got a room code?', join: 'join',
      room: 'room', joinRoom: 'join the room', roomCode: 'room code',
      scan: 'scan with a phone camera, or type the code on this site.',
      copy: 'copy link', copied: 'copied', waiting: 'waiting for player two',
      start: 'start', startBot: 'start with the computer',
      score: 'score', level: 'level', lines: 'rows', you: 'you',
      kMove: 'move', kTurn: 'turn', kDown: 'faster', kSpace: 'space', kDrop: 'drop',
      drop: 'drop', again: 'play again', botTake: 'keep going with the computer',
      opening: 'opening the room...', joining: 'looking for the room...',
      noRoom: 'no room with that code. check the code and try again.',
      full: 'that room already has two players.',
      netDown: 'could not reach the room service. check your connection and try again.',
      youreIn: 'you are in. the game starts when the host presses start.',
      ready: 'you are both here.',
      over: 'the stack reached the top', overDetail: '{a} closed {x} rows, {b} closed {y}, {z} of them together.',
      waitHost: 'the host can start another round.',
      partnerLeft: 'your partner dropped out', partnerLeftDetail: 'paused. they can come back with the code {code}.',
      awayYou: 'are you there?', awayYouDetail: 'paused. press any key to keep playing.',
      awayOther: '{name} is away', awayOtherDetail: 'paused. the game goes on when they are back.',
      hostLeft: 'lost the host', hostLeftDetail: 'trying to get back in...',
      top: 'top scores',
      together: 'together', kSwap: 'swap next', kChat: 'chat', kMic: 'voice, camera', mic: 'mic', cam: 'cam', camNo: 'no camera permission', themMic: '{name} is on voice', micNo: 'no mic permission', voiceFail: 'voice could not connect on this network', chatPh: 'say something', watching: '{n} watching', youWatch: 'you are watching this room. tap a face to cheer.',
      skillEasy: 'level: easy', skillNormal: 'level: normal', skillSharp: 'level: sharp',
      speedCalm: 'speed: calm', speedNormal: 'speed: normal', speedFast: 'speed: fast',
      diffEasy: 'difficulty: easy', diffNormal: 'difficulty: normal', diffHard: 'difficulty: hard',
      helpAsk: 'what do these change?',
      hEasy: 'easy. three block pieces join in, slower fall.',
      hNormal: 'normal. classic four block pieces.',
      hHard: 'hard. five block pieces join in, faster fall.',
      hSkill: 'level. how well pix picks its spot.',
      hSpeed: 'speed. how fast pix moves.',
      localWarn: 'this address only works on this computer. open the site from its network address so a phone can join.'
    },
    tr: {
      yourName: 'adın', create: 'arkadaşınla oyna', solo: 'bilgisayarla oyna',
      haveCode: 'oda kodun var mı?', join: 'katıl',
      room: 'oda', joinRoom: 'odaya katıl', roomCode: 'oda kodu',
      scan: 'telefon kamerasıyla okut ya da kodu bu sitede yaz.',
      copy: 'bağlantıyı kopyala', copied: 'kopyalandı', waiting: 'ikinci oyuncu bekleniyor',
      start: 'başla', startBot: 'bilgisayarla başla',
      score: 'puan', level: 'seviye', lines: 'sıra', you: 'sen',
      kMove: 'oynat', kTurn: 'çevir', kDown: 'hızlan', kSpace: 'boşluk', kDrop: 'bırak',
      drop: 'bırak', again: 'tekrar oyna', botTake: 'bilgisayarla devam et',
      opening: 'oda açılıyor...', joining: 'oda aranıyor...',
      noRoom: 'bu kodla bir oda yok. kodu kontrol edip tekrar dene.',
      full: 'bu odada zaten iki oyuncu var.',
      netDown: 'oda servisine ulaşılamadı. bağlantını kontrol edip tekrar dene.',
      youreIn: 'içeridesin. oda sahibi başlatınca oyun başlar.',
      ready: 'ikiniz de buradasınız.',
      over: 'yığın tepeye ulaştı', overDetail: '{a} {x} sıra kapattı, {b} {y} sıra kapattı, {z} tanesi birlikte.',
      waitHost: 'oda sahibi yeni tur başlatabilir.',
      partnerLeft: 'arkadaşın oyundan düştü', partnerLeftDetail: 'duraklatıldı. {code} koduyla geri gelebilir.',
      awayYou: 'orada mısın?', awayYouDetail: 'duraklatıldı. devam etmek için bir tuşa bas.',
      awayOther: '{name} uzakta', awayOtherDetail: 'duraklatıldı. geri gelince oyun devam eder.',
      hostLeft: 'oda sahibiyle bağlantı koptu', hostLeftDetail: 'tekrar girmeye çalışılıyor...',
      top: 'en iyi skorlar',
      together: 'birlikte', kSwap: 'sıradakini takas et', kChat: 'sohbet', kMic: 'ses, kamera', mic: 'ses', cam: 'kamera', camNo: 'kamera izni yok', themMic: '{name} sesli konuşuyor', micNo: 'mikrofon izni yok', voiceFail: 'bu ağda ses bağlanamadı', chatPh: 'bir şey yaz', watching: '{n} kişi izliyor', youWatch: 'bu odayı izliyorsun. tezahürat için bir yüze dokun.',
      skillEasy: 'seviye: kolay', skillNormal: 'seviye: normal', skillSharp: 'seviye: usta',
      speedCalm: 'hız: sakin', speedNormal: 'hız: normal', speedFast: 'hız: hızlı',
      diffEasy: 'zorluk: kolay', diffNormal: 'zorluk: normal', diffHard: 'zorluk: zor',
      helpAsk: 'bunlar neyi değiştiriyor?',
      hEasy: 'kolay. üç bloklu parçalar da gelir, yavaş düşer.',
      hNormal: 'normal. klasik dört bloklu parçalar.',
      hHard: 'zor. beş bloklu parçalar da gelir, hızlı düşer.',
      hSkill: 'seviye. pix yerini ne kadar iyi seçer.',
      hSpeed: 'hız. pix ne kadar hızlı oynar.',
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
    $('chat-in').placeholder = t('chatPh');
    renderVoice();
    $('bot-speed').textContent = t(BOT_SPEED_WORD[botSpeed]);
    $('bot-skill').textContent = t(BOT_SKILL_WORD[botSkill]);
    $('diff').textContent = t(DIFF_WORD[gameDiff]);
    renderHelp();
    refreshOverlay();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* pixel icons *-*-*-*-*-*-*-*-*-*-*-*
  const ICONS = {
    left: ['...#...', '..##...', '.######', '#######', '.######', '..##...', '...#...'],
    right: ['...#...', '...##..', '######.', '#######', '######.', '...##..', '...#...'],
    down: ['..###..', '..###..', '..###..', '#######', '.#####.', '..###..', '...#...'],
    up: ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'],
    turn: ['.#####..', '#.....#.', '#.......', '#....#..', '#....##.', '.#######', '.....##.', '.....#..'],
    swap: ['..#....', '.######', '..#....', '.......', '....#..', '######.', '....#..'],
    heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
    star: ['...#...', '..###..', '#######', '.#####.', '.#####.', '.##.##.', '##...##'],
    bang: ['..###..', '..###..', '..###..', '..###..', '..###..', '.......', '..###..'],
    face: ['.#####.', '#.....#', '#.#.#.#', '#.....#', '#.###.#', '#.....#', '.#####.'],
    p3: ['...', '#..', '##.'],
    p4: ['...', '.#.', '###'],
    p5: ['.#.', '###', '.#.'],
    soundOn: ['...#....', '..##..#.', '####.#.#', '####...#', '####.#.#', '..##..#.', '...#....'],
    soundOff: ['...#....', '..##....', '####....', '####....', '####....', '..##....', '...#....']
  };
  function pix(name) {
    const rows = ICONS[name];
    let r = '';
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] === '#') { r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }
      }
    }
    return '<svg class="pix" viewBox="0 0 ' + rows[0].length + ' ' + rows.length + '" aria-hidden="true">' + r + '</svg>';
  }

  // *-*-*-*-*-*-*-*-*-*-*-* sound *-*-*-*-*-*-*-*-*-*-*-*
  let ac = null;
  let muted = store('idkname-mute') === '1';
  function wake() {
    stillHere();
    for (const id of ['voice', 'face-0', 'face-1']) {
      const v = $(id);
      if (v && v.srcObject && v.paused) { v.play().catch(function () { /* still blocked */ }); }
    }
    if (ac || muted) { return; }
    const A = window.AudioContext || window.webkitAudioContext;
    if (A) { ac = new A(); }
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ac || muted) { return; }
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur); }
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  const SFX = {
    move: function () { tone(330, 0.035, 'square', 0.03); },
    turn: function () { tone(494, 0.05, 'square', 0.035, 660); },
    lock: function () { tone(150, 0.09, 'triangle', 0.14, 70); },
    slam: function () { tone(220, 0.14, 'triangle', 0.18, 50); },
    clear: function (n) {
      const notes = [523, 659, 784, 1047, 1319];
      for (let i = 0; i < 2 + n; i++) { tone(notes[Math.min(i, 4)], 0.09, 'square', 0.05, null, i * 0.06); }
    },
    level: function () {
      tone(784, 0.1, 'square', 0.05, null, 0.3);
      tone(1175, 0.2, 'square', 0.05, null, 0.4);
    },
    over: function () {
      const notes = [392, 330, 262, 196];
      for (let i = 0; i < 4; i++) { tone(notes[i], 0.22, 'triangle', 0.12, null, i * 0.18); }
    },
    swap: function () {
      tone(440, 0.06, 'square', 0.045, 880);
      tone(880, 0.06, 'square', 0.045, 440, 0.07);
    },
    move2: function () { tone(220, 0.035, 'square', 0.022); },
    turn2: function () { tone(370, 0.05, 'square', 0.026, 494); },
    say: function () { tone(784, 0.04, 'square', 0.03, 988); },
    cheer: function () { tone(1047, 0.07, 'square', 0.03, 1319); },
    join: function () {
      tone(659, 0.08, 'square', 0.05);
      tone(988, 0.14, 'square', 0.05, null, 0.09);
    }
  };
  function showSound() { $('sound').innerHTML = pix(muted ? 'soundOff' : 'soundOn'); }

  // *-*-*-*-*-*-*-*-*-*-*-* palette *-*-*-*-*-*-*-*-*-*-*-*
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const names = ['board', 'panel', 'p1', 'p1l', 'p1d', 'p1x', 'p2', 'p2l', 'p2d', 'p2x', 'face', 'ink', 'mute', 'accent'];
    for (const n of names) { C[n] = cs.getPropertyValue('--' + n).trim(); }
    C.panelD = cs.getPropertyValue('--panel-d').trim();
  }
  function setPalette(name) {
    document.documentElement.dataset.palette = name;
    store('idkname-palette', name);
    document.querySelectorAll('.swatch').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setPalette === name));
    });
    readColors();
    drawLogos(1);
    setFavicon();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* session *-*-*-*-*-*-*-*-*-*-*-*
  let role = null;        // 'host' | 'guest'
  let me = 0;             // my player index
  let code = '';
  let peer = null;
  let conn = null;        // host: the guest link. guest: the host link.
  let watchers = [];      // host: people who joined a full room and only watch
  let watchCount = 0;
  const REACTS = ['heart', 'star', 'bang', 'face'];
  const REACT_COLOR = ['--p1', '--accent', '--ink', '--p2'];
  let names = ['', ''];
  let state = null;       // host: live engine state
  let view = null;        // what gets drawn (host: state, guest: last snapshot)
  let paused = false;
  let botOn = false;
  let botClock = 0;
  const BOT_PACE = [2.2, 1, 0.45];
  const BOT_SPEED_WORD = ['speedCalm', 'speedNormal', 'speedFast'];
  const BOT_SKILL_WORD = ['skillEasy', 'skillNormal', 'skillSharp'];
  let botSkill = Math.min(2, Math.max(0, parseInt(store('idkname-bot-skill') || '1', 10) || 0));
  let botSpeed = Math.min(2, Math.max(0, parseInt(store('idkname-bot-speed') || '1', 10) || 0));
  const DIFF_WORD = ['diffEasy', 'diffNormal', 'diffHard'];
  const savedDiff = parseInt(store('idkname-diff'), 10);
  let gameDiff = savedDiff === 0 || savedDiff === 2 ? savedDiff : 1;
  let dirty = false;
  let lastSend = 0;
  // *-*-*-*-*-*-*-*-*-*-*-* away: a player who touches nothing for a while pauses the game, it never ends it *-*-*-*-*-*-*-*-*-*-*-*
  let AWAY_MS = 20000;
  let away = -1;          // which player is away, -1 nobody. the host decides, everyone is told with the board.
  let seen = [0, 0];      // host: when each player last touched anything
  let awaySeat = false;   // host: the computer is keeping an away guest's seat
  let guestName = '';
  let lastHere = 0;
  let guestAck = 0;       // host: the last guest move it has applied
  let moveN = 0;          // guest: counts its own moves
  let pending = [];       // guest: moves sent but not yet seen in a snapshot
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
    $('logo-link').classList.toggle('off', id === 'home');
    if (id === 'game') {
      applyRole();
      fitBoard();
    }
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
    peer = Net.host(code);
    peer.on('open', function () {
      $('home-status').textContent = '';
      enterLobby();
    });
    peer.on('connection', hostAccept);
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
    c.on('open', function () { c._last = performance.now(); });
    c.on('data', function (m) {
      c._last = performance.now();
      if (c === conn) { lastHeard = c._last; }
      if (m.t === 'hello') {
        const seatFree = !conn || !conn.open || conn === c;
        if (seatFree) {
          conn = c;
          guestAck = 0;
          lastHeard = c._last;
          names[1] = String(m.name || 'p2').slice(0, 12);
          guestName = names[1];
          seen = [performance.now(), performance.now()];
          away = -1;
          awaySeat = false;
          botOn = false;
          SFX.join();
          if (state) {
            state.players[1].name = names[1];
            paused = false;
            dirty = true;
            refreshOverlay();
          }
        } else if (watchers.length < 12) {
          if (watchers.indexOf(c) === -1) { watchers.push(c); }
        } else {
          c.send({ t: 'full' });
          setTimeout(function () { c.close(); }, 300);
          return;
        }
        sendLobby();
        sendState(true);
        renderLobby();
        return;
      }
      if (m.t === 'react') {
        relayReact(m.e);
        return;
      }
      if (c !== conn) { return; }
      if (m.t === 'rtc') {
        voiceSignal(m);
        return;
      }
      if (m.t === 'in' || m.t === 'chat' || m.t === 'here') { markHere(1); }
      if (m.t === 'chat') {
        hostSay(1, m.m);
        return;
      }
      if (m.t === 'in') {
        // the guest draws its own move at once; the number tells it which of its moves this board already holds.
        guestAck = m.n || 0;
        if (state && !paused && !botOn && E.input(state, 1, m.a)) { dirty = true; }
        sendState(true);
      }
    });
    c.on('close', function () {
      const w = watchers.indexOf(c);
      if (w !== -1) {
        watchers.splice(w, 1);
        sendLobby();
        renderLobby();
        return;
      }
      hostDrop(c);
    });
  }

  // host: a player touched something. if they were the one away, the game goes on; an away guest gets the seat back.
  function markHere(i) {
    const now = performance.now();
    seen[i] = now;
    if (i === 1 && awaySeat && botOn && state) {
      awaySeat = false;
      botOn = false;
      names[1] = guestName;
      state.players[1].name = guestName;
      sendLobby();
      sendState(true);
    }
    if (away !== i) { return; }
    away = -1;
    paused = false;
    seen = [now, now];
    refreshOverlay();
    sendState(true);
  }

  function links() {
    const all = watchers.filter(function (w) { return w.open; });
    if (conn && conn.open) { all.unshift(conn); }
    return all;
  }

  function relayReact(e) {
    e = Math.max(0, Math.min(REACTS.length - 1, e | 0));
    showReact(e);
    for (const c of links()) { c.send({ t: 'react', e: e }); }
  }

  function hostDrop(c) {
    if (c !== conn) { return; }
    conn = null;
    away = -1;
    names[1] = '';
    if (state && !state.over) { paused = true; }
    renderLobby();
    refreshOverlay();
    try { c.close(); } catch (e) { /* already gone */ }
  }

  function sendLobby() {
    watchCount = watchers.length;
    if (conn && conn.open) { conn.send({ t: 'lobby', names: names, playing: !!state, as: 'play', w: watchCount }); }
    for (const w of watchers) {
      if (w.open) { w.send({ t: 'lobby', names: names, playing: !!state, as: 'watch', w: watchCount }); }
    }
  }

  function sendState(force) {
    const now = performance.now();
    const all = links();
    if (all.length === 0 || !state) { return; }
    if (!force && now - lastSend < 33) { return; }
    lastSend = now;
    dirty = false;
    const snap = E.snapshot(state);
    const msg = { t: 'state', s: snap };
    const msg2 = { t: 'state', s: snap, w: away, k: guestAck };
    msg.w = away;
    for (const c of all) { c.send(c === conn ? msg2 : msg); }
  }

  function hostStart(withBot) {
    if (withBot) {
      botOn = true;
      names[1] = BOT_NAME;
    }
    state = E.newGame(names, gameDiff);
    view = state;
    paused = false;
    away = -1;
    awaySeat = false;
    seen = [performance.now(), performance.now()];
    botClock = 0;
    lastRun = null;
    show('game');
    refreshOverlay();
    sendState(true);
    if (simTimer) { clearInterval(simTimer); }
    let last = performance.now();
    simTimer = setInterval(function () {
      const now = performance.now();
      const dt = Math.min(100, now - last);
      last = now;
      if (paused) { return; }
      if (state.started && !state.over) {
        for (let i = 0; i < 2; i++) {
          if (i === 1 && (botOn || !conn || !conn.open)) { continue; }
          if (now - seen[i] > AWAY_MS) {
            away = i;
            paused = true;
            refreshOverlay();
            sendState(true);
            return;
          }
        }
      }
      // strict turns: the computer only plays after the human has placed a piece, never before.
      // until then its piece hangs at the top with its eyes closed. it lowers its piece step by step.
      const waitNow = botOn && state.players[1].locks >= state.players[0].locks;
      if (waitNow !== state.players[1].wait) { dirty = true; }
      state.players[1].wait = waitNow;
      if (botOn && !state.over && !state.players[1].wait) {
        botClock += dt;
        const a = Bot.act(state, 1, botSkill);
        const pace = (a === 'drop' ? 75 : Math.max(150, 300 - state.level * 12)) * BOT_PACE[botSpeed];
        if (a && botClock >= pace) {
          botClock = 0;
          if (!E.input(state, 1, a === 'drop' ? 'D' : a)) { E.input(state, 1, 'D'); }
          dirty = true;
        }
      }
      if (E.step(state, dt)) { dirty = true; }
      if (dirty) { sendState(false); }
      if (state.over && $('overlay').hidden) { refreshOverlay(); }
    }, 16);
  }

  function soloStart() {
    role = 'host';
    me = 0;
    names[0] = myName();
    store('idkname-name', $('name').value.trim());
    hostStart(true);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* guest *-*-*-*-*-*-*-*-*-*-*-*
  function guestJoin(roomCode) {
    role = 'guest';
    me = 1;
    code = roomCode.toUpperCase();
    store('idkname-name', $('name').value.trim());
    $('home-status').textContent = t('joining');
    if (peer) { peer.destroy(); }
    peer = null;
    linkLost = false;
    guestConnect();
  }

  function guestConnect() {
    const c = Net.join(code);
    c.on('error', function (err) {
      // once we have been in the room, keep knocking until the host is back.
      if (linkLost) {
        setTimeout(guestConnect, 1500);
        return;
      }
      $('home-status').textContent = t(err.type === 'peer-unavailable' ? 'noRoom' : err.type === 'full' ? 'full' : 'netDown');
    });
    c.on('open', function () {
      conn = c;
      pending = [];
      linkLost = false;
      lastHeard = performance.now();
      c.send({ t: 'hello', name: myName() });
    });
    c.on('data', function (m) {
      lastHeard = performance.now();
      if (m.t === 'full') {
        $('home-status').textContent = t('full');
        show('home');
      } else if (m.t === 'react') {
        showReact(m.e);
      } else if (m.t === 'chat') {
        say(m.p, m.m);
      } else if (m.t === 'rtc') {
        voiceSignal(m);
      } else if (m.t === 'lobby') {
        names = m.names;
        watchCount = m.w || 0;
        role = m.as === 'watch' ? 'watch' : 'guest';
        me = role === 'watch' ? -1 : 1;
        applyRole();
        if (!m.playing) {
          view = null;
          enterLobby();
        }
        refreshOverlay();
      } else if (m.t === 'state') {
        view = m.s;
        away = typeof m.w === 'number' ? m.w : -1;
        if (me === 1) {
          pending = pending.filter(function (q) { return q.n > (m.k || 0); });
          for (const q of pending) { predict(view, q.a); }
        }
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
    const now = performance.now();
    if (role === 'host') {
      for (const w of watchers.slice()) {
        if (w.open) { w.send({ t: 'ping' }); }
        if (now - w._last > SILENCE_MS) {
          watchers.splice(watchers.indexOf(w), 1);
          try { w.close(); } catch (e) { /* already gone */ }
          sendLobby();
          renderLobby();
        }
      }
    }
    if (!conn || !conn.open) { return; }
    conn.send({ t: 'ping' });
    if (now - lastHeard > SILENCE_MS) {
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
    $('start-bot').hidden = !isHost;
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
    const here = names[1] && names[1] !== BOT_NAME;
    if (here) {
      s1.textContent = names[1];
      s1.className = '';
      s1.dataset.locked = '1';
    } else {
      delete s1.dataset.locked;
      s1.className = 'waiting';
      s1.textContent = t('waiting');
    }
    if (role === 'host') {
      $('start').disabled = !here;
      $('start-bot').hidden = !!here;
      if (here) { $('lobby-status').textContent = t('ready'); }
    } else {
      $('lobby-status').textContent = t(role === 'watch' ? 'youWatch' : 'youreIn');
    }
    showWatching();
  }

  function showWatching() {
    for (const id of ['watching', 'lobby-watching']) {
      $(id).hidden = watchCount === 0;
      $(id).textContent = t('watching', { n: watchCount });
    }
  }

  // watchers get cheer buttons instead of game keys.
  function applyRole() {
    const w = me < 0;
    $('pad').hidden = w;
    $('legend').hidden = w;
    $('reacts').hidden = !w;
    if (!$('game').hidden) { fitBoard(); }
  }

  function showReact(e) {
    SFX.cheer();
    const el = document.createElement('div');
    el.className = 'emote';
    el.style.color = 'var(' + REACT_COLOR[e] + ')';
    el.style.left = (8 + Math.random() * 78) + '%';
    el.innerHTML = pix(REACTS[e]);
    $('board-frame').appendChild(el);
    setTimeout(function () { el.remove(); }, 1700);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* chat *-*-*-*-*-*-*-*-*-*-*-*
  // a line shows as a bubble over the speaker's face block, and stays in the short log beside the board.
  const SAY_MS = 4200;
  const sayUntil = [0, 0];
  let lastSaid = 0;

  function say(pi, text) {
    pi = pi === 1 ? 1 : 0;
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!text) { return; }
    SFX.say();
    const b = $('say-' + pi);
    b.textContent = text;
    b.hidden = false;
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    sayUntil[pi] = performance.now() + SAY_MS;
    const li = document.createElement('li');
    const who = document.createElement('b');
    who.textContent = (view && view.players[pi].name) || names[pi] || ('p' + (pi + 1));
    const what = document.createElement('span');
    what.textContent = text;
    li.appendChild(who);
    li.appendChild(what);
    const log = $('chat-log');
    log.appendChild(li);
    while (log.children.length > 4) { log.firstChild.remove(); }
  }

  function hostSay(pi, text) {
    text = String(text || '').slice(0, 60);
    say(pi, text);
    for (const c of links()) { c.send({ t: 'chat', p: pi, m: text }); }
  }

  function sendChat() {
    const box = $('chat-in');
    const text = box.value.trim();
    const now = performance.now();
    if (!text || now - lastSaid < 400 || !conn || !conn.open) { return; }
    lastSaid = now;
    box.value = '';
    if (role === 'host') { hostSay(0, text); } else { conn.send({ t: 'chat', m: text }); }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* voice and camera: the two players talk and see each other, straight between them *-*-*-*-*-*-*-*-*-*-*-*
  // the room link only carries the handshake (t: 'rtc'). the host never yields on a clash, the guest does.
  const RTC_CFG = { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }] };
  let pc = null;
  let micTrack = null;
  let micSender = null;
  let micOn = false;
  let micBusy = false;
  let themMic = false;
  let camTrack = null;
  let camSender = null;
  let camOn = false;
  let camBusy = false;
  let themCam = false;
  let themFace = null;
  let makingOffer = false;
  let ignoreOffer = false;
  let voiceNote = '';

  function voiceSend(o) {
    if (conn && conn.open) {
      o.t = 'rtc';
      conn.send(o);
    }
  }
  function voicePc() {
    if (pc) { return pc; }
    const mine = new RTCPeerConnection(RTC_CFG);
    pc = mine;
    mine.onicecandidate = function (e) {
      if (e.candidate) { voiceSend({ c: e.candidate.toJSON() }); }
    };
    mine.onnegotiationneeded = async function () {
      try {
        makingOffer = true;
        await mine.setLocalDescription();
        voiceSend({ d: mine.localDescription.toJSON() });
      } catch (e) {
        /* the next change asks again */
      } finally {
        makingOffer = false;
      }
    };
    mine.ontrack = function (e) {
      if (e.track.kind === 'video') {
        themFace = new MediaStream([e.track]);
        renderVoice();
        return;
      }
      const a = $('voice');
      a.srcObject = new MediaStream([e.track]);
      a.play().catch(function () { /* waits for the next touch, see wake */ });
    };
    mine.onconnectionstatechange = function () {
      if (mine !== pc) { return; }
      if (mine.connectionState === 'failed') {
        voiceStop();
        voiceNote = 'voiceFail';
      }
      renderVoice();
    };
    return mine;
  }
  async function voiceSignal(m) {
    if (m.on !== undefined || m.cam !== undefined) {
      if (m.on !== undefined) { themMic = !!m.on; }
      if (m.cam !== undefined) { themCam = !!m.cam; }
      renderVoice();
      return;
    }
    const p = voicePc();
    try {
      if (m.d) {
        const clash = m.d.type === 'offer' && (makingOffer || p.signalingState !== 'stable');
        ignoreOffer = role === 'host' && clash;
        if (ignoreOffer) { return; }
        await p.setRemoteDescription(m.d);
        if (m.d.type === 'offer') {
          await p.setLocalDescription();
          voiceSend({ d: p.localDescription.toJSON() });
        }
      } else if (m.c) {
        try {
          await p.addIceCandidate(m.c);
        } catch (e) {
          if (!ignoreOffer) { throw e; }
        }
      }
    } catch (e) {
      /* a stale handshake message: the next one settles it */
    }
  }
  async function micToggle() {
    if (micBusy || $('chat').hidden) { return; }
    if (micOn) {
      micOn = false;
      if (micTrack) { micTrack.stop(); }
      micTrack = null;
      if (micSender) { micSender.replaceTrack(null).catch(function () { /* link already closed */ }); }
      voiceSend({ on: false });
      renderVoice();
      return;
    }
    micBusy = true;
    voiceNote = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const track = stream.getAudioTracks()[0];
      if ($('chat').hidden) {
        track.stop();
      } else {
        const p = voicePc();
        if (micSender) {
          await micSender.replaceTrack(track);
        } else {
          micSender = p.addTrack(track, stream);
        }
        micTrack = track;
        micOn = true;
        voiceSend({ on: true });
      }
    } catch (e) {
      voiceNote = 'micNo';
    }
    micBusy = false;
    renderVoice();
  }
  async function camToggle() {
    if (camBusy || $('chat').hidden) { return; }
    if (camOn) {
      camOn = false;
      if (camTrack) { camTrack.stop(); }
      camTrack = null;
      if (camSender) { camSender.replaceTrack(null).catch(function () { /* link already closed */ }); }
      voiceSend({ cam: false });
      renderVoice();
      return;
    }
    camBusy = true;
    voiceNote = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 240 }, height: { ideal: 240 }, frameRate: { ideal: 15 }, facingMode: 'user' } });
      const track = stream.getVideoTracks()[0];
      if ($('chat').hidden) {
        track.stop();
      } else {
        const p = voicePc();
        if (camSender) {
          await camSender.replaceTrack(track);
        } else {
          camSender = p.addTrack(track, stream);
        }
        camTrack = track;
        camOn = true;
        voiceSend({ cam: true });
      }
    } catch (e) {
      voiceNote = 'camNo';
    }
    camBusy = false;
    renderVoice();
  }
  function voiceStop() {
    if (micTrack) { micTrack.stop(); }
    if (camTrack) { camTrack.stop(); }
    micTrack = null;
    micSender = null;
    micOn = false;
    themMic = false;
    camTrack = null;
    camSender = null;
    camOn = false;
    themCam = false;
    themFace = null;
    voiceNote = '';
    if (pc) {
      const old = pc;
      pc = null;
      try { old.close(); } catch (e) { /* already closed */ }
    }
    $('voice').srcObject = null;
    renderVoice();
  }
  function renderVoice() {
    $('mic').classList.toggle('on', micOn);
    $('mic').setAttribute('aria-pressed', micOn ? 'true' : 'false');
    $('cam').classList.toggle('on', camOn);
    $('cam').setAttribute('aria-pressed', camOn ? 'true' : 'false');
    // each face sits in its player's card: your own mirrored, your partner's as sent.
    for (let i = 0; i < 2; i++) {
      const f = $('face-' + i);
      const own = i === me;
      const src = me < 0 ? null : own ? (camOn && camTrack ? camTrack : null) : (themCam && themFace ? themFace.getVideoTracks()[0] : null);
      if (f._track !== src) {
        f._track = src;
        f.srcObject = src ? new MediaStream([src]) : null;
        f.hidden = !src;
        f.classList.toggle('own', own);
        if (src) { f.play().catch(function () { /* waits for the next touch */ }); }
      }
    }
    const faces = !$('face-0').hidden || !$('face-1').hidden;
    if ($('game').classList.contains('faces') !== faces) {
      $('game').classList.toggle('faces', faces);
      fitBoard();
    }
    const other = view && me >= 0 ? view.players[1 - me].name : '';
    $('mic-note').textContent = voiceNote ? t(voiceNote) : themMic ? t('themMic', { name: other }) : '';
  }

  // keeps each bubble by its speaker's piece while it falls: over the piece, tail on the face block.
  function placeSay(now) {
    const cv = $('board');
    const frameEl = $('board-frame');
    const spots = [];
    for (let i = 0; i < 2; i++) {
      const b = $('say-' + i);
      if (b.hidden) { continue; }
      if (now > sayUntil[i]) {
        b.hidden = true;
        continue;
      }
      const p = view && view.players[i].piece;
      const w = b.offsetWidth;
      const h = b.offsetHeight;
      let cx = cv.offsetLeft + (i === 0 ? 0.25 : 0.75) * cv.offsetWidth;
      let top = cv.offsetTop + 2 * cell;
      let under = false;
      let below = top + h + 12;
      if (p && p.cells[1]) {
        let y0 = 99;
        let y1 = -99;
        for (const q of p.cells) {
          y0 = Math.min(y0, q[1]);
          y1 = Math.max(y1, q[1]);
        }
        cx = cv.offsetLeft + (p.x + p.cells[1][0] + 0.5) * cell;
        top = cv.offsetTop + (p.y + y0) * cell - h - 12;
        below = cv.offsetTop + (p.y + y1 + 1) * cell + 12;
        if (top < 4) {
          top = below;
          under = true;
        }
      }
      let left = Math.max(4, Math.min(frameEl.clientWidth - w - 4, cx - w / 2));
      // two bubbles must not sit on each other: the later one slides aside, or goes under its own piece if there is no room.
      const o = spots[0];
      const hits = function () {
        return o && left < o.left + o.w + 6 && o.left < left + w + 6 && top < o.top + o.h + 6 && o.top < top + h + 6;
      };
      if (hits()) {
        const aside = cx >= o.left + o.w / 2 ? o.left + o.w + 8 : o.left - w - 8;
        left = Math.max(4, Math.min(frameEl.clientWidth - w - 4, aside));
        if (hits()) {
          left = Math.max(4, Math.min(frameEl.clientWidth - w - 4, cx - w / 2));
          top = under ? o.top + o.h + 12 : below;
          under = true;
        }
      }
      spots.push({ left: left, top: top, w: w, h: h });
      b.style.left = Math.round(left) + 'px';
      b.style.top = Math.round(top) + 'px';
      b.style.setProperty('--tail', Math.round(Math.max(8, Math.min(w - 16, cx - left - 4))) + 'px');
      b.classList.toggle('under', under);
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
    ctx.fillStyle = '#1b1229';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (q.isDark(y, x)) { ctx.fillRect(x, y, 1, 1); }
      }
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* score table: shared by everyone, with your running game climbing through it *-*-*-*-*-*-*-*-*-*-*-*
  let lastRun = null;
  let globalTop = null;   // null until the shared table answers; then the list falls back to this device
  let liveRank = 0;

  function loadLocal() {
    try {
      const a = JSON.parse(store('idkname-scores') || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function fetchScores() {
    fetch('/api/scores', { cache: 'no-store' }).then(function (r) {
      return r.ok ? r.json() : Promise.reject();
    }).then(function (j) {
      if (Array.isArray(j.top)) {
        globalTop = j.top;
        renderScores();
      }
    }).catch(function () { /* no shared table here (local run or offline): keep the device list */ });
  }
  function recordScore(s) {
    if (s.score <= 0) { return; }
    lastRun = { score: s.score, rows: s.lines, together: s.together || 0, who: s.players[0].name + ' + ' + s.players[1].name, at: Date.now() };
    const all = loadLocal();
    all.push(lastRun);
    all.sort(function (a, b) { return b.score - a.score; });
    store('idkname-scores', JSON.stringify(all.slice(0, 10)));
    // one entry per game, sent by the host. automated test browsers never write to the shared table.
    if (role === 'host' && !navigator.webdriver) {
      fetch('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lastRun)
      }).then(fetchScores).catch(function () { /* stays on this device */ });
    } else {
      setTimeout(fetchScores, 1500);
    }
    renderScores();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* games running right now, on every screen *-*-*-*-*-*-*-*-*-*-*-*
  // the host tells the relay its score every few seconds; everyone reads the list of running games.
  let liveGames = [];
  let liveSent = null;
  const liveId = Math.random().toString(36).slice(2, 12).padEnd(8, '0');
  function livePulse() {
    const running = role === 'host' && view && !view.over && view.score > 0;
    let opt = { cache: 'no-store' };
    if (running) {
      liveSent = { id: liveId, who: view.players[0].name + ' + ' + view.players[1].name, score: view.score, rows: view.lines };
      opt = { method: 'POST', body: JSON.stringify(liveSent) };
    } else if (liveSent) {
      liveSent.over = true;
      opt = { method: 'POST', body: JSON.stringify(liveSent) };
      liveSent = null;
    } else if (document.hidden) {
      return;
    }
    fetch(Net.LIVE + (navigator.webdriver ? '?test=1' : ''), opt).then(function (r) {
      return r.ok ? r.json() : Promise.reject();
    }).then(function (j) {
      if (Array.isArray(j.live)) {
        liveGames = j.live;
        renderScores();
      }
    }).catch(function () { /* relay unreachable: the table shows finished games only */ });
  }

  // the table to show: the shared list, the games other people are playing right now, and a live row for this game.
  function tableRows(count, withLive) {
    const rows = (globalTop || loadLocal()).map(function (r) { return { score: r.score, who: r.who, now: false, live: false }; });
    const sameAsLast = function (r) { return lastRun && r.score === lastRun.score && r.who === lastRun.who; };
    const mineWho = view ? view.players[0].name + ' + ' + view.players[1].name : null;
    for (const g of liveGames) {
      if (g.who !== mineWho) { rows.push({ score: g.score, who: g.who, now: false, live: true }); }
    }
    if (withLive && view && !view.over && view.score > 0) {
      rows.push({ score: view.score, who: mineWho, now: true, live: true });
    } else if (lastRun) {
      const hit = rows.find(sameAsLast);
      if (hit) {
        hit.now = true;
      } else {
        rows.push({ score: lastRun.score, who: lastRun.who, now: true, live: false });
      }
    }
    rows.sort(function (a, b) { return b.score - a.score || (a.now ? 1 : -1); });
    for (let i = 0; i < rows.length; i++) { rows[i].rank = i + 1; }
    // this game and up to three running games always stay in sight, even when they rank below the cut.
    const keep = rows.filter(function (r) { return r.now; }).concat(rows.filter(function (r) { return r.live && !r.now; }).slice(0, 3));
    const top = rows.slice(0, count);
    for (const r of keep) {
      if (top.indexOf(r) !== -1) { continue; }
      for (let i = top.length - 1; i >= 0; i--) {
        if (keep.indexOf(top[i]) === -1) {
          top.splice(i, 1);
          top.push(r);
          break;
        }
      }
    }
    top.sort(function (a, b) { return a.rank - b.rank; });
    return top;
  }
  function fillScores(ol, rows) {
    const sig = rows.map(function (r) { return r.rank + '|' + r.score + '|' + r.who + '|' + r.now + '|' + r.live; }).join('\n');
    if (ol._sig === sig) { return; }
    ol._sig = sig;
    ol.textContent = '';
    for (const r of rows) {
      const li = document.createElement('li');
      li.className = (r.now ? 'now' : '') + (r.live ? ' live' : '');
      for (const v of [r.rank, r.score, r.who]) {
        const sp = document.createElement('span');
        sp.textContent = v;
        li.appendChild(sp);
      }
      ol.appendChild(li);
    }
  }
  function renderScores() {
    const home = tableRows(5, false);
    $('home-best').hidden = home.length === 0;
    fillScores($('home-scores'), home);
    fillScores($('ov-scores'), tableRows(5, false));
    const side = tableRows(8, true);
    $('side-top').hidden = side.length === 0;
    fillScores($('side-scores'), side);
    // a small hop when the running game passes someone.
    const mine = side.find(function (r) { return r.now; });
    const rank = mine && view && !view.over ? mine.rank : 0;
    if (rank && liveRank && rank < liveRank && !STILL) {
      const li = $('side-scores').querySelector('.now');
      if (li) { li.classList.add('bump'); }
    }
    liveRank = rank;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* overlay (game over, partner gone) *-*-*-*-*-*-*-*-*-*-*-*
  function refreshOverlay() {
    const ov = $('overlay');
    if (!view) {
      ov.hidden = true;
      return;
    }
    $('bot-take').hidden = true;
    $('ov-scores').hidden = !view.over;
    if (view.over) {
      ov.hidden = false;
      $('ov-title').textContent = t('over');
      $('ov-score').textContent = String(view.score);
      $('ov-score').hidden = false;
      const d = t('overDetail', {
        a: view.players[0].name, x: view.players[0].lines,
        b: view.players[1].name, y: view.players[1].lines, z: view.together || 0
      });
      $('ov-detail').textContent = role === 'host' ? d : d + ' ' + t('waitHost');
      $('again').hidden = role !== 'host' || !names[1];
    } else if (away >= 0) {
      ov.hidden = false;
      $('ov-title').textContent = away === me ? t('awayYou') : t('awayOther', { name: view.players[away].name });
      $('ov-score').hidden = true;
      $('ov-detail').textContent = t(away === me ? 'awayYouDetail' : 'awayOtherDetail');
      $('again').hidden = true;
      $('bot-take').hidden = !(role === 'host' && away === 1);
    } else if (role === 'host' && paused) {
      ov.hidden = false;
      $('ov-title').textContent = t('partnerLeft');
      $('ov-score').hidden = true;
      $('ov-detail').textContent = t('partnerLeftDetail', { code: code });
      $('again').hidden = true;
      $('bot-take').hidden = false;
    } else if (role !== 'host' && linkLost) {
      ov.hidden = false;
      $('ov-title').textContent = t('hostLeft');
      $('ov-score').hidden = true;
      $('ov-detail').textContent = t('hostLeftDetail');
      $('again').hidden = true;
    } else {
      ov.hidden = true;
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* drawing: one block *-*-*-*-*-*-*-*-*-*-*-*
  let cell = 24;

  function sizeCanvas(cv, w, h) {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // face: 0 none, 1 awake, 2 blink, 3 surprised
  function block(ctx, x, y, c, owner, face, alpha, tiny) {
    const k = owner === 1 ? 'p1' : 'p2';
    const u = Math.max(1, Math.round(c / 8));
    ctx.globalAlpha = alpha || 1;
    ctx.fillStyle = C[k + 'x'];
    ctx.fillRect(x, y, c, c);
    ctx.fillStyle = C[k + 'd'];
    ctx.fillRect(x, y, c - u, c - u);
    ctx.fillStyle = C[k + 'l'];
    ctx.fillRect(x, y, c - u, u);
    ctx.fillRect(x, y, u, c - u);
    ctx.fillStyle = C[k];
    ctx.fillRect(x + u, y + u, c - 3 * u, c - 3 * u);
    if (c >= 12) {
      ctx.fillStyle = C[k + 'l'];
      ctx.fillRect(x + 2 * u, y + 2 * u, u, u);
    }
    if (face && (c >= 16 || tiny)) {
      ctx.fillStyle = C.face;
      const e = Math.max(2, Math.round(c / 10));
      const cx = x + Math.round((c - u) / 2);
      const ey = y + Math.round(c * 0.36);
      const eh = face === 2 ? Math.max(1, Math.floor(e / 2)) : e + 1;
      const eo = face === 2 ? e : 0;
      ctx.fillRect(cx - 2 * e, ey + eo, e, eh);
      ctx.fillRect(cx + e, ey + eo, e, eh);
      if (face === 3) {
        ctx.fillRect(cx - Math.floor(e / 2), y + Math.round(c * 0.62), e, e);
      } else {
        ctx.fillRect(cx - e, y + Math.round(c * 0.66), 2 * e, Math.max(1, Math.floor(e / 2)));
      }
    }
    ctx.globalAlpha = 1;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* drawing: effects *-*-*-*-*-*-*-*-*-*-*-*
  const fx = { parts: [], floats: [], flash: null, trail: null, seenLock: 0, seenClear: 0, seenSwap: 0, seenLevel: 1, seenOver: false };

  // the partner's piece is heard too, a little lower and softer than your own.
  let heard = null;
  let heardN = 0;
  function hearPartner(s) {
    if (me < 0) { return; }
    const pl = s.players[1 - me];
    const p = pl.piece;
    const sig = p ? { locks: pl.locks, kind: p.kind, x: p.x, cells: p.cells.join('|') } : null;
    if (sig && heard && sig.locks === heard.locks && sig.kind === heard.kind && !s.over) {
      if (sig.cells !== heard.cells) {
        SFX.turn2();
        heardN++;
      } else if (sig.x !== heard.x) {
        SFX.move2();
        heardN++;
      }
    }
    heard = sig;
  }

  function watchEvents(s, c) {
    if (s.lockN < fx.seenLock || s.clearN < fx.seenClear) {
      fx.seenLock = 0;
      fx.seenClear = 0;
      fx.seenSwap = 0;
      fx.seenLevel = 1;
      fx.seenOver = false;
      fx.parts = [];
      fx.floats = [];
    }
    const now = performance.now();
    if (s.lockN > fx.seenLock && s.lastLock) {
      fx.flash = { cells: s.lastLock.cells, t0: now };
      if (s.lastLock.fall > 1 && s.lastLock.pi === me) {
        fx.trail = { cells: s.lastLock.cells, fall: s.lastLock.fall, pi: s.lastLock.pi, t0: now };
        SFX.slam();
        shake();
      } else {
        SFX.lock();
      }
    }
    fx.seenLock = s.lockN;
    if (s.clearN > fx.seenClear && s.lastClear) {
      const lc = s.lastClear;
      SFX.clear(lc.rows.length);
      shake();
      if (!STILL) {
        for (const y of lc.rows) {
          for (let x = 0; x < E.W; x++) {
            const owner = s.board[y][x] || 1;
            for (let i = 0; i < 3; i++) {
              fx.parts.push({
                x: (x + 0.5) * c, y: (y + 0.5) * c,
                vx: (Math.random() - 0.5) * c * 9, vy: -Math.random() * c * 8 - c,
                life: 0.5 + Math.random() * 0.4, age: 0,
                color: C[(owner === 1 ? 'p1' : 'p2') + (i === 0 ? 'l' : '')],
                size: Math.max(2, Math.round(c / (4 + i)))
              });
            }
          }
        }
      }
      fx.floats.push({ text: '+' + lc.gain + (lc.mixed ? ' ' + t('together') : ''), x: E.W * c / 2, y: (lc.rows[0] + 0.5) * c, age: 0, life: lc.mixed ? 1.5 : 0.9 });
    }
    fx.seenClear = s.clearN;
    if ((s.swapN || 0) > fx.seenSwap) {
      SFX.swap();
      document.querySelectorAll('.card .next').forEach(function (n) {
        n.classList.remove('swapped');
        void n.offsetWidth;
        n.classList.add('swapped');
      });
    }
    fx.seenSwap = s.swapN || 0;
    if (s.level > fx.seenLevel) { SFX.level(); }
    fx.seenLevel = s.level;
    if (s.over && !fx.seenOver) {
      SFX.over();
      recordScore(s);
      refreshOverlay();
    }
    fx.seenOver = s.over;
  }

  function shake() {
    if (STILL) { return; }
    const f = $('board-frame');
    f.classList.remove('shake');
    void f.offsetWidth;
    f.classList.add('shake');
  }

  // *-*-*-*-*-*-*-*-*-*-*-* drawing: a whole board *-*-*-*-*-*-*-*-*-*-*-*
  function drawBoard(ctx, s, c, ghostFor, live, dt) {
    const now = performance.now();
    ctx.fillStyle = C.board;
    ctx.fillRect(0, 0, E.W * c, E.H * c);
    // faint dots where four cells meet.
    ctx.fillStyle = C.mute;
    ctx.globalAlpha = 0.16;
    const d = Math.max(1, Math.round(c / 14));
    for (let y = 1; y < E.H; y++) {
      for (let x = 1; x < E.W; x++) { ctx.fillRect(x * c - d, y * c - d, d * 2, d * 2); }
    }
    ctx.globalAlpha = 1;

    const blink = s.clearing && Math.floor(now / 60) % 2 === 0;
    for (let y = 0; y < E.H; y++) {
      const going = s.clearing && s.clearing.rows.indexOf(y) !== -1;
      for (let x = 0; x < E.W; x++) {
        const v = s.board[y][x];
        if (!v) { continue; }
        if (going && blink) {
          ctx.fillStyle = C.ink;
          ctx.fillRect(x * c, y * c, c, c);
        } else {
          block(ctx, x * c, y * c, c, v, going ? 3 : 0);
        }
      }
    }

    if (ghostFor !== null && !s.over) {
      const p = s.players[ghostFor].piece;
      const gy = E.landing(s, ghostFor);
      if (p && gy !== null && gy !== p.y) {
        const k = ghostFor === 0 ? 'p1' : 'p2';
        const u = Math.max(2, Math.round(c / 8));
        ctx.fillStyle = C[k];
        for (const q of p.cells) {
          const gx = (p.x + q[0]) * c;
          const gyy = (gy + q[1]) * c;
          ctx.globalAlpha = 0.13;
          ctx.fillRect(gx, gyy, c, c);
          ctx.globalAlpha = 0.55;
          ctx.fillRect(gx + u, gyy + u, u, u);
          ctx.fillRect(gx + c - 2 * u, gyy + u, u, u);
          ctx.fillRect(gx + u, gyy + c - 2 * u, u, u);
          ctx.fillRect(gx + c - 2 * u, gyy + c - 2 * u, u, u);
        }
        ctx.globalAlpha = 1;
      }
    }

    if (live && fx.trail) {
      const a = 1 - (now - fx.trail.t0) / 200;
      if (a <= 0) {
        fx.trail = null;
      } else {
        ctx.fillStyle = C[fx.trail.pi === 0 ? 'p1l' : 'p2l'];
        for (const q of fx.trail.cells) {
          ctx.globalAlpha = a * 0.3;
          ctx.fillRect(q[0] * c + c / 4, (q[1] - fx.trail.fall) * c, c / 2, fx.trail.fall * c);
        }
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < 2; i++) {
      const p = s.players[i].piece;
      if (!p) { continue; }
      const closed = s.players[i].wait || away === i || (now + i * 1700) % 3400 < 130;
      for (let j = 0; j < p.cells.length; j++) {
        block(ctx, (p.x + p.cells[j][0]) * c, (p.y + p.cells[j][1]) * c, c, i + 1, j === 1 ? (closed ? 2 : 1) : 0);
      }
    }

    if (!live) { return; }
    if (fx.flash) {
      const a = 1 - (now - fx.flash.t0) / 130;
      if (a <= 0) {
        fx.flash = null;
      } else {
        ctx.fillStyle = C.ink;
        ctx.globalAlpha = a * 0.75;
        for (const q of fx.flash.cells) { ctx.fillRect(q[0] * c, q[1] * c, c, c); }
        ctx.globalAlpha = 1;
      }
    }
    for (const p of fx.parts) {
      p.age += dt;
      p.vy += c * 34 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age < p.life) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }
    fx.parts = fx.parts.filter(function (p) { return p.age < p.life; });
    ctx.font = Math.round(c * 1.25) + 'px "Jersey 15", monospace';
    ctx.textAlign = 'center';
    for (const f of fx.floats) {
      f.age += dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, 2 * (1 - f.age / f.life)));
      ctx.fillStyle = C.face;
      ctx.fillText(f.text, f.x + 2, f.y - f.age * c * 2 + 2);
      ctx.fillStyle = C.ink;
      ctx.fillText(f.text, f.x, f.y - f.age * c * 2);
    }
    ctx.globalAlpha = 1;
    fx.floats = fx.floats.filter(function (f) { return f.age < f.life; });
  }

  function fitBoard() {
    const wrap = $('boardwrap');
    const small = window.innerWidth <= 760 || matchMedia('(pointer: coarse)').matches;
    const pad = small ? 12 : 20;
    const availH = wrap.clientHeight - pad - 16;
    const sideRoom = small ? 24 + pad : (window.innerWidth <= 1080 ? 520 : 620);
    const availW = Math.max(200, window.innerWidth - sideRoom);
    cell = Math.max(10, Math.floor(Math.min(availH / E.H, availW / E.W)));
    sizeCanvas($('board'), E.W * cell, E.H * cell);
    document.querySelector('.hud').style.width = small ? '' : (E.W * cell + pad) + 'px';
    document.querySelector('.hud').style.justifySelf = 'center';
    document.querySelectorAll('.card .next').forEach(function (n) {
      const u = small ? 11 : 22;
      n._u = u;
      sizeCanvas(n, u * 5, u * 4);
    });
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

  let lastFrame = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    drawSky(now);
    if ($('game').hidden || !view) { return; }
    watchEvents(view, cell);
    hearPartner(view);
    drawBoard($('board').getContext('2d'), view, cell, me >= 0 ? me : null, true, dt);
    const showSet = role === 'host';
    if ($('bot-set').hidden === showSet || $('bot-skill').hidden === botOn) {
      $('bot-set').hidden = !showSet;
      $('bot-skill').hidden = !botOn;
      $('bot-speed').hidden = !botOn;
      renderHelp();
      fitBoard();
    }
    const talk = me >= 0 && !!conn && conn.open && !(role === 'host' && botOn);
    if ($('chat').hidden === talk) {
      $('chat').hidden = !talk;
      $('legend-chat').hidden = !talk;
      $('legend-mic').hidden = !talk;
      if (!talk) { voiceStop(); }
      $('game').classList.toggle('talk', talk);
      fitBoard();
    }
    placeSay(now);
    if (skyTick % 12 === 0) { renderScores(); }
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

  // *-*-*-*-*-*-*-*-*-*-*-* the sky: a few slow pixels behind everything *-*-*-*-*-*-*-*-*-*-*-*
  let stars = [];
  function seedSky() {
    const cv = $('sky');
    cv.width = Math.ceil(window.innerWidth / 4);
    cv.height = Math.ceil(window.innerHeight / 4);
    stars = [];
    const n = Math.round(cv.width * cv.height / 900);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.floor(Math.random() * cv.width), y: Math.floor(Math.random() * cv.height), ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.7, big: Math.random() < 0.12 });
    }
  }
  let skyTick = 0;
  function drawSky(now) {
    skyTick++;
    if (skyTick % 6 !== 0 && skyTick > 1) { return; }
    const cv = $('sky');
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of stars) {
      const a = STILL ? 0.3 : 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.big ? C.accent : C.mute;
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big) {
        ctx.globalAlpha = a * 0.5;
        ctx.fillRect(s.x - 1, s.y, 3, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* logo: the name, built from the game's own blocks *-*-*-*-*-*-*-*-*-*-*-*
  const GLYPHS = {
    i: ['#', '.', '#', '#', '#', '#', '#'],
    d: ['...#', '...#', '.###', '#..#', '#..#', '#..#', '.###'],
    k: ['#...', '#...', '#..#', '#.#.', '##..', '#.#.', '#..#'],
    n: ['....', '....', '###.', '#..#', '#..#', '#..#', '#..#'],
    a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###'],
    m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
    e: ['....', '....', '.##.', '#..#', '####', '#...', '.###']
  };
  const WORD = 'idkname';
  const LOGO_W = 32;

  // k: 0..1, how far the dot of the i has fallen into place.
  // letters are solid shapes with light only on their outer top-left edges; the dot of the i is a real game block.
  function drawLogo(cv, u, k) {
    const sh = Math.max(1, Math.round(u / 3));
    const padX = Math.round(u / 2);
    sizeCanvas(cv, LOGO_W * u + sh + padX, 8 * u + sh);
    const ctx = cv.getContext('2d');
    ctx.translate(padX, 0);
    const grid = [];
    for (let y = 0; y < 7; y++) { grid.push(new Array(LOGO_W).fill(0)); }
    let ox = 0;
    for (let n = 0; n < WORD.length; n++) {
      const g = GLYPHS[WORD[n]];
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < g[y].length; x++) {
          if (g[y][x] === '#' && !(n === 0 && y === 0)) { grid[y][ox + x] = 1; }
        }
      }
      ox += g[0].length + 1;
    }
    const at = function (x, y) { return y >= 0 && y < 7 && x >= 0 && x < LOGO_W ? grid[y][x] : 0; };
    const e = Math.max(1, Math.round(u / 5));
    // hard shadow first, then the letters.
    ctx.fillStyle = C.panelD;
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < LOGO_W; x++) {
        if (grid[y][x]) { ctx.fillRect(x * u + sh, (y + 1) * u + sh, u, u); }
      }
    }
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < LOGO_W; x++) {
        const v = grid[y][x];
        if (!v) { continue; }
        const key = v === 1 ? 'p1' : 'p2';
        const px = x * u;
        const py = (y + 1) * u;
        ctx.fillStyle = C[key];
        ctx.fillRect(px, py, u, u);
        ctx.fillStyle = C[key + 'd'];
        if (!at(x, y + 1)) { ctx.fillRect(px, py + u - e, u, e); }
        if (!at(x + 1, y)) { ctx.fillRect(px + u - e, py, e, u); }
        ctx.fillStyle = C[key + 'l'];
        if (!at(x, y - 1)) { ctx.fillRect(px, py, u - (at(x + 1, y) ? 0 : e), e); }
        if (!at(x - 1, y)) { ctx.fillRect(px, py, e, u - (at(x, y + 1) ? 0 : e)); }
      }
    }
    if (k > 0) {
      const dy = Math.round((1 - (1 - k) * 5) * u);
      if (u >= 10) {
        // a slightly bigger block with a face, sitting on the stem.
        const b = u * 2;
        block(ctx, -padX, dy + 2 * u - b - Math.round(u / 4), b, 1, 1, 1, true);
      } else {
        block(ctx, 0, dy, u, 1, 0);
      }
    }
  }

  function drawLogos(k) {
    const small = window.innerWidth <= 760;
    drawLogo($('logo-small'), small ? 3 : 4, 1);
    const room = Math.min(448, window.innerWidth - 32);
    drawLogo($('logo-big'), Math.max(6, Math.floor(room / (LOGO_W + 1))), k);
  }

  function dropLogoDot() {
    if (STILL) {
      drawLogos(1);
      return;
    }
    const t0 = performance.now() + 350;
    const tick = function () {
      const k = Math.min(1, Math.max(0, (performance.now() - t0) / 420));
      const eased = k * k;
      drawLogos(k <= 0 ? 0 : Math.max(0.02, eased));
      if (k < 1) {
        requestAnimationFrame(tick);
      } else {
        SFX.lock();
      }
    };
    tick();
  }

  function setFavicon() {
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    const ctx = cv.getContext('2d');
    block(ctx, 0, 0, 16, 1, 0);
    block(ctx, 0, 16, 16, 1, 0);
    block(ctx, 16, 16, 16, 2, 0);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = cv.toDataURL();
  }

  // *-*-*-*-*-*-*-*-*-*-*-* the home screen board: two computer players at work *-*-*-*-*-*-*-*-*-*-*-*
  let demo = null;
  let demoTimer = null;

  function startDemo() {
    if (demoTimer) { return; }
    const cv = $('demo');
    const small = window.innerWidth <= 760;
    const c = Math.max(12, Math.floor(Math.min((window.innerHeight - 170) / E.H, (window.innerWidth * (small ? 0.7 : 0.36)) / E.W, 32)));
    sizeCanvas(cv, E.W * c, E.H * c);
    demo = E.newGame(['', '']);
    let n = 0;
    demoTimer = setInterval(function () {
      n++;
      if (!STILL || n < 500) {
        if (n % 5 === 0) {
          const who = (n / 5) % 2;
          const a = Bot.act(demo, who);
          if (a && !E.input(demo, who, a)) { E.input(demo, who, 'D'); }
        }
        E.step(demo, 40);
        if (demo.over) { demo = E.newGame(['', '']); }
      }
      drawBoard(cv.getContext('2d'), demo, c, null, false, 0);
    }, 40);
  }
  function stopDemo() {
    if (demoTimer) { clearInterval(demoTimer); }
    demoTimer = null;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* input *-*-*-*-*-*-*-*-*-*-*-*
  function act(a) {
    if (!view || view.over || $('game').hidden || me < 0) { return; }
    if (a === 'L' || a === 'R') { SFX.move(); }
    if (a === 'rot') { SFX.turn(); }
    if (role === 'host') {
      if (!paused && E.input(state, 0, a)) { dirty = true; }
    } else if (conn && conn.open) {
      moveN++;
      conn.send({ t: 'in', a: a, n: moveN });
      if (a === 'L' || a === 'R' || a === 'rot' || a === 'D') {
        pending.push({ n: moveN, a: a });
        if (pending.length > 40) { pending.shift(); }
        predict(view, a);
      }
    }
  }

  // the guest moves its own piece on its own screen right away; the host's next snapshot confirms or corrects it.
  // any key or touch counts as being here. the guest tells the host, at most every two seconds.
  function stillHere() {
    if (role === 'host') {
      if (state) { markHere(0); }
      return;
    }
    const now = performance.now();
    if (me === 1 && conn && conn.open && now - lastHere > 2000) {
      lastHere = now;
      conn.send({ t: 'here' });
    }
  }

  function predict(v, a) {
    const p = v.players[1].piece;
    if (!p || v.over || v.clearing || !v.started) { return; }
    if (a === 'D') {
      if (!E.hit(v, 1, p.cells, p.x, p.y + 1)) { p.y++; }
      return;
    }
    E.input(v, 1, a);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* held keys: our own repeat, so down does not wait for the keyboard's slow one *-*-*-*-*-*-*-*-*-*-*-*
  const held = {};
  function holdStart(a) {
    if (held[a]) { return; }
    held[a] = {};
    act(a);
    if (a !== 'L' && a !== 'R' && a !== 'D') { return; }
    const h = held[a];
    h.wait = setTimeout(function () {
      h.rep = setInterval(function () { act(a); }, a === 'D' ? 30 : 45);
    }, a === 'D' ? 70 : 140);
  }
  function holdStop(a) {
    const h = held[a];
    if (!h) { return; }
    clearTimeout(h.wait);
    clearInterval(h.rep);
    delete held[a];
  }
  function holdStopAll() {
    for (const a of Object.keys(held)) { holdStop(a); }
  }

  const KEYS = {
    ArrowLeft: 'L', a: 'L', A: 'L',
    ArrowRight: 'R', d: 'R', D: 'R',
    ArrowDown: 'D', s: 'D', S: 'D',
    ArrowUp: 'rot', w: 'rot', W: 'rot', x: 'rot', X: 'rot',
    ' ': 'drop', c: 'swap', C: 'swap'
  };
  window.addEventListener('keydown', function (ev) {
    wake();
    if ($('game').hidden) { return; }
    if (ev.target === $('chat-in')) { return; }
    if (ev.key === 'Enter' && !$('chat').hidden && !ev.repeat) {
      ev.preventDefault();
      holdStopAll();
      $('chat-in').focus();
      return;
    }
    if ((ev.key === 'm' || ev.key === 'M') && !$('chat').hidden && !ev.repeat) {
      micToggle();
      return;
    }
    if ((ev.key === 'v' || ev.key === 'V') && !$('chat').hidden && !ev.repeat) {
      camToggle();
      return;
    }
    const a = KEYS[ev.key];
    if (!a) { return; }
    ev.preventDefault();
    holdStart(a);
  });
  window.addEventListener('keyup', function (ev) {
    const a = KEYS[ev.key];
    if (a) { holdStop(a); }
  });
  window.addEventListener('blur', holdStopAll);
  window.addEventListener('pointerdown', wake);

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
          rep = setInterval(function () { act(a); }, a === 'D' ? 30 : 45);
        }, a === 'D' ? 70 : 140);
      }
    });
    for (const n of ['pointerup', 'pointercancel', 'pointerleave']) { b.addEventListener(n, stop); }
    b.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  });

  // *-*-*-*-*-*-*-*-*-*-*-* wiring *-*-*-*-*-*-*-*-*-*-*-*
  $('create').addEventListener('click', function () { hostOpen(0); });
  $('solo').addEventListener('click', soloStart);
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
  $('start').addEventListener('click', function () { hostStart(false); });
  $('start-bot').addEventListener('click', function () { hostStart(true); });
  $('again').addEventListener('click', function () { hostStart(botOn); });
  $('bot-take').addEventListener('click', function () {
    botOn = true;
    awaySeat = away === 1;
    away = -1;
    seen[0] = performance.now();
    names[1] = BOT_NAME;
    state.players[1].name = BOT_NAME;
    paused = false;
    refreshOverlay();
    sendLobby();
    sendState(true);
  });
  $('cam').addEventListener('click', function () {
    camToggle();
    $('cam').blur();
  });
  $('mic').addEventListener('click', function () {
    micToggle();
    $('mic').blur();
  });
  $('chat-in').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      sendChat();
      $('chat-in').blur();
    } else if (ev.key === 'Escape') {
      $('chat-in').blur();
    }
  });
  let lastReact = 0;
  document.querySelectorAll('#reacts button').forEach(function (b) {
    b.style.color = 'var(' + REACT_COLOR[+b.dataset.react] + ')';
    b.addEventListener('click', function () {
      const now = performance.now();
      if (now - lastReact < 350 || !conn || !conn.open) { return; }
      lastReact = now;
      conn.send({ t: 'react', e: +b.dataset.react });
    });
  });
  // *-*-*-*-*-*-*-*-*-*-*-* difficulty and the ? that explains the settings *-*-*-*-*-*-*-*-*-*-*-*
  function renderHelp() {
    const rows = [['p3', 'hEasy', gameDiff === 0], ['p4', 'hNormal', gameDiff === 1], ['p5', 'hHard', gameDiff === 2]];
    if (botOn) {
      rows.push([null, 'hSkill', false]);
      rows.push([null, 'hSpeed', false]);
    }
    $('help-box').innerHTML = rows.map(function (r) {
      return '<li' + (r[2] ? ' class="on"' : '') + '><span class="hp">' + (r[0] ? pix(r[0]) : '') + '</span><span>' + t(r[1]) + '</span></li>';
    }).join('');
    $('set-help').setAttribute('aria-label', t('helpAsk'));
    $('set-help').title = t('helpAsk');
  }
  $('set-help').addEventListener('click', function () {
    const open = $('help-box').hidden;
    $('help-box').hidden = !open;
    $('set-help').setAttribute('aria-expanded', String(open));
    $('set-help').blur();
    fitBoard();
    fitHelp();
  });
  // on a short window the panel keeps to the screen and scrolls inside instead of running off the bottom.
  function fitHelp() {
    const box = $('help-box');
    if (box.hidden) { return; }
    box.style.maxHeight = '';
    const room = window.innerHeight - box.getBoundingClientRect().top - 14;
    if (box.offsetHeight > room) { box.style.maxHeight = Math.max(120, room) + 'px'; }
  }
  window.addEventListener('resize', fitHelp);
  $('diff').addEventListener('click', function () {
    gameDiff = (gameDiff + 1) % 3;
    store('idkname-diff', String(gameDiff));
    $('diff').textContent = t(DIFF_WORD[gameDiff]);
    if (role === 'host' && state) {
      E.setDiff(state, gameDiff);
      dirty = true;
    }
    renderHelp();
    $('diff').blur();
  });
  $('bot-skill').addEventListener('click', function () {
    botSkill = (botSkill + 1) % 3;
    store('idkname-bot-skill', String(botSkill));
    $('bot-skill').textContent = t(BOT_SKILL_WORD[botSkill]);
    $('bot-skill').blur();
  });
  $('bot-speed').addEventListener('click', function () {
    botSpeed = (botSpeed + 1) % 3;
    store('idkname-bot-speed', String(botSpeed));
    $('bot-speed').textContent = t(BOT_SPEED_WORD[botSpeed]);
    $('bot-speed').blur();
  });
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
  $('sound').addEventListener('click', function () {
    muted = !muted;
    store('idkname-mute', muted ? '1' : '0');
    showSound();
    wake();
    SFX.turn();
  });
  document.querySelectorAll('.swatch').forEach(function (b) {
    b.addEventListener('click', function () { setPalette(b.dataset.setPalette); });
  });
  window.addEventListener('resize', function () {
    seedSky();
    drawLogos(1);
    if (!$('game').hidden) { fitBoard(); }
    if (!$('home').hidden) {
      stopDemo();
      startDemo();
    }
  });

  // *-*-*-*-*-*-*-*-*-*-*-* boot *-*-*-*-*-*-*-*-*-*-*-*
  document.querySelectorAll('[data-icon]').forEach(function (el) { el.innerHTML = pix(el.dataset.icon); });
  showSound();
  seedSky();
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
  renderScores();
  fetchScores();
  setInterval(function () {
    if (!document.hidden) { fetchScores(); }
  }, 20000);
  livePulse();
  setInterval(livePulse, 4000);
  show('home');
  dropLogoDot();
  requestAnimationFrame(frame);
  // read-only peek for the browser test.
  window.__idkname = { view: function () { return view; }, paused: function () { return paused; }, role: function () { return role; }, away: function () { return away; }, setAway: function (ms) { AWAY_MS = ms; }, heard: function () { return heardN; }, voice: function () { return { mic: micOn, them: themMic, cam: camOn, themCam: themCam, state: pc ? pc.connectionState : 'none', pc: pc }; } };
})();
