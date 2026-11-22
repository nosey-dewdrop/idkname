// *-*-*-*-*-*-*-*-*-*-*-* idkname bot *-*-*-*-*-*-*-*-*-*-*-*
// the computer partner. it looks at every place its piece could land and walks there one key press at a time.

(function (root) {
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Engine;

  function sig(cells) {
    return cells.map(function (c) { return c[0] + ',' + c[1]; }).sort().join(';');
  }

  // *-*-*-*-*-*-*-*-*-*-*-* how good is a resting place *-*-*-*-*-*-*-*-*-*-*-*
  function evaluate(s, cells, x, y, other) {
    const rows = s.board.map(function (r) { return r.slice(); });
    for (const c of cells) { rows[y + c[1]][x + c[0]] = 9; }
    let lines = 0;
    const kept = [];
    for (const r of rows) {
      if (r.every(function (v) { return v !== 0; })) {
        lines++;
      } else {
        kept.push(r);
      }
    }
    while (kept.length < E.H) { kept.unshift(new Array(E.W).fill(0)); }
    let total = 0;
    let holes = 0;
    let bumps = 0;
    let prev = -1;
    for (let cx = 0; cx < E.W; cx++) {
      let h = 0;
      for (let cy = 0; cy < E.H; cy++) {
        if (kept[cy][cx]) {
          if (h === 0) { h = E.H - cy; }
        } else if (h > 0) {
          holes++;
        }
      }
      total += h;
      if (prev >= 0) { bumps += Math.abs(h - prev); }
      prev = h;
    }
    let score = lines * CFG.lines - total * CFG.height - holes * CFG.holes - bumps * CFG.bumps;
    // do not dive under the partner's falling piece.
    if (other) {
      for (const c of cells) {
        for (const oc of other.cells) {
          if (other.x + oc[0] === x + c[0] && other.y + oc[1] <= y + c[1]) { score -= 0.25; }
        }
      }
    }
    return score;
  }

  const CFG = { lines: 0.76, height: 0.051, holes: 0.9, bumps: 0.12, side: 0.4 };

  // skill: 0 easy, 1 normal, 2 sharp. a weaker bot misjudges places, the same way for the whole life of a piece,
  // so it commits to its mistake instead of dithering.
  const NOISE = [1.1, 0.35, 0];
  function wobble(a, b, c) {
    let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
    h = (h ^ (h >>> 13)) * 1274126177;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295 * 2 - 1;
  }

  function plan(s, pi, skill) {
    const amp = NOISE[skill === undefined ? 2 : skill];
    const p = s.players[pi].piece;
    if (!p) { return null; }
    const other = s.players[1 - pi].piece;
    let best = null;
    let cells = p.cells;
    const seen = {};
    for (let r = 0; r < 4; r++) {
      const k = sig(cells);
      if (!seen[k]) {
        seen[k] = true;
        const w = E.size(cells).w;
        for (let x = 0; x <= E.W - w; x++) {
          if (E.hit(s, pi, cells, x, p.y, true)) { continue; }
          let y = p.y;
          while (!E.hit(s, pi, cells, x, y + 1, true)) { y++; }
          // each player mostly keeps to their own half, so partners do not fight over one gap.
          const mid = x + w / 2;
          const away = pi === 0 ? Math.max(0, mid - E.W / 2) : Math.max(0, E.W / 2 - mid);
          const sc = evaluate(s, cells, x, y, other) - CFG.side * away - (r > 0 ? 0.01 : 0) +
            amp * wobble(s.players[pi].locks + 1, x + 1, r + 1);
          if (!best || sc > best.score) { best = { score: sc, sig: k, x: x }; }
        }
      }
      cells = E.rotated(cells);
    }
    return best;
  }

  // the next key the bot wants to press, or null.
  function act(s, pi, skill) {
    const p = s.players[pi].piece;
    if (!p || s.over || s.clearing) { return null; }
    const b = plan(s, pi, skill);
    if (!b) { return 'D'; }
    if (sig(p.cells) !== b.sig) { return 'rot'; }
    if (p.x < b.x) { return 'R'; }
    if (p.x > b.x) { return 'L'; }
    return 'drop';
  }

  const Bot = { act: act, plan: plan, CFG: CFG };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Bot;
  } else {
    root.Bot = Bot;
  }
})(typeof window !== 'undefined' ? window : globalThis);
