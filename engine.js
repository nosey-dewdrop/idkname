// *-*-*-*-*-*-*-*-*-*-*-* duodrop engine *-*-*-*-*-*-*-*-*-*-*-*
// pure game rules, no dom, no network. the host runs it, the guest only reads its state.

(function (root) {
  const W = 12;
  const H = 20;
  const HALF = W / 2;
  const CLEAR_MS = 260;
  const LINES_PER_LEVEL = 8;
  const LINE_SCORE = [0, 100, 300, 500, 800, 1200];

  // *-*-*-*-*-*-*-*-*-*-*-* pieces *-*-*-*-*-*-*-*-*-*-*-*
  const SHAPES = {
    bar3: [[0, 0], [1, 0], [2, 0]],
    bar4: [[0, 0], [1, 0], [2, 0], [3, 0]],
    nook: [[0, 0], [0, 1], [1, 1]],
    box: [[0, 0], [1, 0], [0, 1], [1, 1]],
    hookA: [[0, 0], [0, 1], [1, 1], [2, 1]],
    hookB: [[2, 0], [0, 1], [1, 1], [2, 1]],
    hat: [[1, 0], [0, 1], [1, 1], [2, 1]],
    stepA: [[1, 0], [2, 0], [0, 1], [1, 1]],
    stepB: [[0, 0], [1, 0], [1, 1], [2, 1]],
    star: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    cup: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
  };
  const BAG = ['bar3', 'bar4', 'bar4', 'nook', 'box', 'hookA', 'hookB', 'hat', 'stepA', 'stepB', 'star', 'cup'];

  function size(cells) {
    let w = 0;
    let h = 0;
    for (const c of cells) {
      if (c[0] + 1 > w) { w = c[0] + 1; }
      if (c[1] + 1 > h) { h = c[1] + 1; }
    }
    return { w: w, h: h };
  }

  function rotated(cells) {
    const h = size(cells).h;
    return cells.map(function (c) { return [h - 1 - c[1], c[0]]; });
  }

  function newBag() {
    const b = BAG.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = b[i];
      b[i] = b[j];
      b[j] = t;
    }
    return b;
  }

  function draw(player) {
    if (!player.bag || player.bag.length === 0) { player.bag = newBag(); }
    const kind = player.bag.pop();
    return { kind: kind, cells: SHAPES[kind].map(function (c) { return c.slice(); }) };
  }

  // *-*-*-*-*-*-*-*-*-*-*-* state *-*-*-*-*-*-*-*-*-*-*-*
  function newGame(names) {
    const s = {
      w: W, h: H,
      board: [],
      players: [],
      score: 0, lines: 0, level: 1,
      started: true, over: false,
      clearing: null
    };
    for (let y = 0; y < H; y++) { s.board.push(new Array(W).fill(0)); }
    for (let i = 0; i < 2; i++) {
      const p = { name: names[i], piece: null, next: null, lines: 0, timer: 0, bag: [] };
      p.next = draw(p);
      s.players.push(p);
    }
    return s;
  }

  function interval(s) {
    return Math.max(90, 800 - (s.level - 1) * 65);
  }

  // *-*-*-*-*-*-*-*-*-*-*-* collision *-*-*-*-*-*-*-*-*-*-*-*
  // 'wall' | 'locked' | 'other' | null. solid things win over the other player's piece.
  function hit(s, pi, cells, x, y, ignoreOther) {
    const o = ignoreOther ? null : s.players[1 - pi].piece;
    let other = false;
    for (const c of cells) {
      const px = x + c[0];
      const py = y + c[1];
      if (px < 0 || px >= W || py < 0 || py >= H) { return 'wall'; }
      if (s.board[py][px]) { return 'locked'; }
      if (o) {
        for (const oc of o.cells) {
          if (o.x + oc[0] === px && o.y + oc[1] === py) { other = true; }
        }
      }
    }
    return other ? 'other' : null;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* lock, clear, spawn *-*-*-*-*-*-*-*-*-*-*-*
  function lock(s, pi) {
    const p = s.players[pi].piece;
    for (const c of p.cells) {
      s.board[p.y + c[1]][p.x + c[0]] = pi + 1;
    }
    s.players[pi].piece = null;
    s.players[pi].timer = 0;
    const rows = [];
    for (let y = 0; y < H; y++) {
      if (s.board[y].every(function (v) { return v !== 0; })) { rows.push(y); }
    }
    if (rows.length > 0) {
      s.clearing = { rows: rows, t: CLEAR_MS, by: pi };
    }
  }

  function finishClear(s) {
    const rows = s.clearing.rows;
    const n = rows.length;
    const kept = s.board.filter(function (r, y) { return rows.indexOf(y) === -1; });
    while (kept.length < H) { kept.unshift(new Array(W).fill(0)); }
    s.board = kept;
    s.score += LINE_SCORE[Math.min(n, 5)] * s.level;
    s.lines += n;
    s.players[s.clearing.by].lines += n;
    s.level = 1 + Math.floor(s.lines / LINES_PER_LEVEL);
    s.clearing = null;
    // a falling piece may now sit inside rows that slid down; lift it out.
    for (let i = 0; i < 2; i++) {
      const p = s.players[i].piece;
      if (!p) { continue; }
      while (p.y > 0 && hit(s, i, p.cells, p.x, p.y, true)) { p.y--; }
      if (hit(s, i, p.cells, p.x, p.y, true)) { s.over = true; }
    }
  }

  function spawn(s, pi) {
    const pl = s.players[pi];
    const next = pl.next;
    const x = pi * HALF + Math.floor((HALF - size(next.cells).w) / 2);
    const h = hit(s, pi, next.cells, x, 0);
    if (h === 'other') { return false; }
    if (h) {
      s.over = true;
      return true;
    }
    pl.piece = { kind: next.kind, cells: next.cells, x: x, y: 0 };
    pl.next = draw(pl);
    pl.timer = 0;
    return true;
  }

  // one row down. resting on the partner's piece never locks, only solid ground does.
  function tickDown(s, pi) {
    const p = s.players[pi].piece;
    const h = hit(s, pi, p.cells, p.x, p.y + 1);
    if (h === null) {
      p.y++;
      return 'moved';
    }
    if (h !== 'other') {
      lock(s, pi);
      return 'locked';
    }
    // two pieces hooked into each other would hang forever; move them as one body.
    const o = s.players[1 - pi].piece;
    if (o && hit(s, 1 - pi, o.cells, o.x, o.y + 1) === 'other') {
      const a = hit(s, pi, p.cells, p.x, p.y + 1, true);
      const b = hit(s, 1 - pi, o.cells, o.x, o.y + 1, true);
      if (!a && !b) {
        p.y++;
        o.y++;
        return 'moved';
      }
      if (a) {
        lock(s, pi);
        return 'locked';
      }
    }
    return 'rest';
  }

  // *-*-*-*-*-*-*-*-*-*-*-* input *-*-*-*-*-*-*-*-*-*-*-*
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, 1]];

  function input(s, pi, action) {
    if (!s.started || s.over || s.clearing) { return false; }
    const pl = s.players[pi];
    const p = pl.piece;
    if (!p) { return false; }
    if (action === 'L' || action === 'R') {
      const nx = p.x + (action === 'L' ? -1 : 1);
      if (hit(s, pi, p.cells, nx, p.y)) { return false; }
      p.x = nx;
      return true;
    }
    if (action === 'D') {
      const r = tickDown(s, pi);
      if (r === 'moved') { s.score += 1; }
      pl.timer = 0;
      return r !== 'rest';
    }
    if (action === 'rot') {
      if (p.kind === 'box' || p.kind === 'star') { return false; }
      const nc = rotated(p.cells);
      const a = size(p.cells);
      const b = size(nc);
      const bx = p.x + Math.round((a.w - b.w) / 2);
      const by = p.y + Math.round((a.h - b.h) / 2);
      for (const k of KICKS) {
        if (!hit(s, pi, nc, bx + k[0], by + k[1])) {
          p.cells = nc;
          p.x = bx + k[0];
          p.y = by + k[1];
          return true;
        }
      }
      return false;
    }
    if (action === 'drop') {
      while (hit(s, pi, p.cells, p.x, p.y + 1) === null) {
        p.y++;
        s.score += 2;
      }
      tickDown(s, pi);
      pl.timer = 0;
      return true;
    }
    return false;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* time *-*-*-*-*-*-*-*-*-*-*-*
  function step(s, dt) {
    if (!s.started || s.over) { return false; }
    if (s.clearing) {
      s.clearing.t -= dt;
      if (s.clearing.t <= 0) { finishClear(s); }
      return true;
    }
    let changed = false;
    const iv = interval(s);
    for (let i = 0; i < 2; i++) {
      const pl = s.players[i];
      if (s.over || s.clearing) { break; }
      if (!pl.piece) {
        if (spawn(s, i)) { changed = true; }
        continue;
      }
      pl.timer += dt;
      while (pl.timer >= iv && pl.piece && !s.clearing) {
        pl.timer -= iv;
        if (tickDown(s, i) !== 'rest') { changed = true; }
      }
    }
    return changed;
  }

  // where a piece would land, for the ghost.
  function landing(s, pi) {
    const p = s.players[pi].piece;
    if (!p) { return null; }
    let y = p.y;
    while (hit(s, pi, p.cells, p.x, y + 1) === null) { y++; }
    return y;
  }

  function snapshot(s) {
    return {
      w: s.w, h: s.h, board: s.board,
      score: s.score, lines: s.lines, level: s.level,
      started: s.started, over: s.over, clearing: s.clearing,
      players: s.players.map(function (p) {
        return { name: p.name, piece: p.piece, next: p.next, lines: p.lines };
      })
    };
  }

  const Engine = {
    W: W, H: H, SHAPES: SHAPES,
    newGame: newGame, input: input, step: step, hit: hit,
    landing: landing, snapshot: snapshot, size: size, interval: interval
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
  } else {
    root.Engine = Engine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
