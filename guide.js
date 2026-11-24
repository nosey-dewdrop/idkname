// *-*-*-*-*-*-*-*-*-*-*-* guide pages: palette, logo, sky and the small board you can play on *-*-*-*-*-*-*-*-*-*-*-*
(function () {
  'use strict';
  const E = window.Engine;
  const $ = function (id) { return document.getElementById(id); };
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(k, v) {
    try {
      if (v === undefined) { return localStorage.getItem(k); }
      localStorage.setItem(k, v);
    } catch (e) { /* private mode: nothing is remembered */ }
    return null;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* palette *-*-*-*-*-*-*-*-*-*-*-*
  let C = {};
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    for (const n of ['board', 'panel', 'p1', 'p1l', 'p1d', 'p1x', 'p2', 'p2l', 'p2d', 'p2x', 'face', 'ink', 'mute', 'accent']) {
      C[n] = cs.getPropertyValue('--' + n).trim();
    }
    C.panelD = cs.getPropertyValue('--panel-d').trim();
  }
  function setPalette(name) {
    document.documentElement.dataset.palette = name;
    store('idkname-palette', name);
    document.querySelectorAll('.swatch').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setPalette === name));
    });
    readColors();
    drawLogo();
    drawSky();
    if (game) { game.draw(); }
  }

  function sizeCanvas(cv, w, h) {
    const d = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(w * d);
    cv.height = Math.round(h * d);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  }

  // one block, drawn the way the game draws it.
  function block(ctx, x, y, c, owner, face) {
    const k = owner === 1 ? 'p1' : 'p2';
    const u = Math.max(1, Math.round(c / 8));
    ctx.fillStyle = C[k + 'x'];
    ctx.fillRect(x, y, c, c);
    ctx.fillStyle = C[k + 'd'];
    ctx.fillRect(x, y, c - u, c - u);
    ctx.fillStyle = C[k + 'l'];
    ctx.fillRect(x, y, c - u, u);
    ctx.fillRect(x, y, u, c - u);
    ctx.fillStyle = C[k];
    ctx.fillRect(x + u, y + u, c - 3 * u, c - 3 * u);
    ctx.fillStyle = C[k + 'l'];
    ctx.fillRect(x + 2 * u, y + 2 * u, u, u);
    if (face) {
      ctx.fillStyle = C.face;
      const e = Math.max(2, Math.round(c / 10));
      const cx = x + Math.round((c - u) / 2);
      const ey = y + Math.round(c * 0.36);
      ctx.fillRect(cx - 2 * e, ey, e, e + 1);
      ctx.fillRect(cx + e, ey, e, e + 1);
      ctx.fillRect(cx - e, y + Math.round(c * 0.66), 2 * e, Math.max(1, Math.floor(e / 2)));
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* logo *-*-*-*-*-*-*-*-*-*-*-*
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
  function drawLogo() {
    const cv = $('logo-small');
    const u = window.innerWidth <= 760 ? 3 : 4;
    sizeCanvas(cv, LOGO_W * u + 4, 8 * u + 2);
    const ctx = cv.getContext('2d');
    let ox = 0;
    for (let n = 0; n < WORD.length; n++) {
      const g = GLYPHS[WORD[n]];
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < g[y].length; x++) {
          if (g[y][x] !== '#') { continue; }
          ctx.fillStyle = C.panelD;
          ctx.fillRect((ox + x) * u + 1, (y + 1) * u + 1, u, u);
          ctx.fillStyle = C.p1;
          ctx.fillRect((ox + x) * u, (y + 1) * u, u, u);
        }
      }
      ox += g[0].length + 1;
    }
  }

  // *-*-*-*-*-*-*-*-*-*-*-* sky: the same scattered stars as the game, still *-*-*-*-*-*-*-*-*-*-*-*
  function drawSky() {
    const cv = $('sky');
    sizeCanvas(cv, window.innerWidth, window.innerHeight);
    const ctx = cv.getContext('2d');
    let seed = 7;
    const rnd = function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const n = Math.round(window.innerWidth * window.innerHeight / 14000);
    for (let i = 0; i < n; i++) {
      const x = Math.round(rnd() * window.innerWidth);
      const y = Math.round(rnd() * window.innerHeight);
      const big = rnd() > 0.86;
      ctx.globalAlpha = 0.18 + rnd() * 0.3;
      ctx.fillStyle = big ? C.accent : C.mute;
      ctx.fillRect(x, y, 3, 3);
      if (big) {
        ctx.fillRect(x - 3, y, 9, 3);
        ctx.fillRect(x, y - 3, 3, 9);
      }
    }
    ctx.globalAlpha = 1;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* the small board: one player, both colours taking turns, real pieces and real fall speed *-*-*-*-*-*-*-*-*-*-*-*
  function Try(cv) {
    const W = 8;
    const H = 14;
    const kinds = cv.dataset.bag.split(',');
    const ms = Number(cv.dataset.ms) || 800;
    let cell = 28;
    let board = [];
    let piece = null;
    let owner = 2;
    let bag = [];
    let timer = 0;
    let rows = 0;
    let together = 0;
    let flash = 0;

    function clear() {
      board = [];
      for (let y = 0; y < H; y++) { board.push(new Array(W).fill(0)); }
    }
    function hit(cells, x, y) {
      for (const c of cells) {
        const px = x + c[0];
        const py = y + c[1];
        if (px < 0 || px >= W || py >= H) { return true; }
        if (py >= 0 && board[py][px]) { return true; }
      }
      return false;
    }
    function spawn() {
      if (bag.length === 0) {
        bag = kinds.slice();
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = bag[i];
          bag[i] = bag[j];
          bag[j] = t;
        }
      }
      const kind = bag.pop();
      const cells = E.SHAPES[kind].map(function (c) { return c.slice(); });
      owner = owner === 1 ? 2 : 1;
      piece = { kind: kind, cells: cells, x: Math.floor((W - E.size(cells).w) / 2), y: 0 };
      if (hit(piece.cells, piece.x, piece.y)) { clear(); }
    }
    function lock() {
      for (const c of piece.cells) {
        if (piece.y + c[1] >= 0) { board[piece.y + c[1]][piece.x + c[0]] = owner; }
      }
      for (let y = H - 1; y >= 0; y--) {
        if (board[y].every(Boolean)) {
          if (board[y].indexOf(1) !== -1 && board[y].indexOf(2) !== -1) { together++; }
          rows++;
          board.splice(y, 1);
          board.unshift(new Array(W).fill(0));
          flash = 6;
          y++;
        }
      }
      const r = $('try-rows');
      if (r) { r.textContent = rows; }
      const t = $('try-together');
      if (t) { t.textContent = together; }
      spawn();
    }
    function act(a) {
      if (!piece) { return; }
      if (a === 'L' || a === 'R') {
        const nx = piece.x + (a === 'L' ? -1 : 1);
        if (!hit(piece.cells, nx, piece.y)) { piece.x = nx; }
      } else if (a === 'D') {
        if (hit(piece.cells, piece.x, piece.y + 1)) { lock(); } else { piece.y++; }
        timer = 0;
      } else if (a === 'drop') {
        while (!hit(piece.cells, piece.x, piece.y + 1)) { piece.y++; }
        lock();
        timer = 0;
      } else if (a === 'rot') {
        // the same rule as the game: the box and the star do not turn, the rest try a few nearby spots.
        if (piece.kind === 'box' || piece.kind === 'star') { return; }
        const nc = E.rotated(piece.cells);
        const a0 = E.size(piece.cells);
        const b0 = E.size(nc);
        const bx = piece.x + Math.round((a0.w - b0.w) / 2);
        const by = piece.y + Math.round((a0.h - b0.h) / 2);
        for (const k of [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, 1]]) {
          if (!hit(nc, bx + k[0], by + k[1])) {
            piece.cells = nc;
            piece.x = bx + k[0];
            piece.y = by + k[1];
            break;
          }
        }
      }
      draw();
    }
    function fit() {
      const room = Math.min(cv.parentElement.clientWidth, window.innerWidth <= 860 ? 232 : 300);
      cell = Math.max(16, Math.floor(room / W));
      sizeCanvas(cv, W * cell, H * cell);
      draw();
    }
    function draw() {
      const ctx = cv.getContext('2d');
      ctx.fillStyle = C.board;
      ctx.fillRect(0, 0, W * cell, H * cell);
      ctx.fillStyle = C.panel;
      const dot = Math.max(2, Math.round(cell / 9));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          ctx.fillRect(x * cell + Math.round((cell - dot) / 2), y * cell + Math.round((cell - dot) / 2), dot, dot);
        }
      }
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (board[y][x]) { block(ctx, x * cell, y * cell, cell, board[y][x], false); }
        }
      }
      if (piece) {
        for (let i = 0; i < piece.cells.length; i++) {
          const c = piece.cells[i];
          if (piece.y + c[1] >= 0) { block(ctx, (piece.x + c[0]) * cell, (piece.y + c[1]) * cell, cell, owner, i === 1); }
        }
      }
      if (flash > 0) {
        ctx.globalAlpha = flash / 14;
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 0, W * cell, H * cell);
        ctx.globalAlpha = 1;
      }
    }
    let lastT = 0;
    function frame(now) {
      const dt = Math.min(100, now - (lastT || now));
      lastT = now;
      if (!document.hidden) {
        timer += dt;
        if (flash > 0) {
          flash--;
          draw();
        }
        if (timer >= ms) {
          timer = 0;
          act('D');
        }
      }
      requestAnimationFrame(frame);
    }

    const KEYS = {
      ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowDown: 'D', s: 'D', S: 'D',
      ArrowUp: 'rot', w: 'rot', W: 'rot', x: 'rot', X: 'rot', ' ': 'drop'
    };
    // the keys belong to the board only while it has the focus, so the page still scrolls with the arrows.
    cv.addEventListener('keydown', function (ev) {
      const a = KEYS[ev.key];
      if (!a) { return; }
      ev.preventDefault();
      act(a);
    });
    cv.addEventListener('pointerdown', function () { cv.focus({ preventScroll: true }); });
    document.querySelectorAll('[data-try]').forEach(function (b) {
      b.addEventListener('click', function () {
        act(b.dataset.try);
        if (matchMedia('(pointer: fine)').matches) { cv.focus({ preventScroll: true }); }
      });
    });
    window.addEventListener('resize', fit);

    clear();
    spawn();
    fit();
    requestAnimationFrame(frame);
    return { draw: draw };
  }

  // *-*-*-*-*-*-*-*-*-*-*-* start *-*-*-*-*-*-*-*-*-*-*-*
  let game = null;
  document.querySelectorAll('.swatch').forEach(function (b) {
    b.addEventListener('click', function () { setPalette(b.dataset.setPalette); });
  });
  setPalette(store('idkname-palette') || 'candy');
  if ($('try') && E) { game = Try($('try')); }
  window.addEventListener('resize', function () {
    drawLogo();
    drawSky();
  });
  if (STILL) { document.documentElement.classList.add('still'); }
})();
