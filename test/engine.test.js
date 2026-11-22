// *-*-*-*-*-*-*-*-*-*-*-* engine checks *-*-*-*-*-*-*-*-*-*-*-*
// run: node test/engine.test.js

const E = require('../engine.js');
const assert = require('assert');

function overlapCheck(s) {
  const seen = {};
  for (let i = 0; i < 2; i++) {
    const p = s.players[i].piece;
    if (!p) { continue; }
    for (const c of p.cells) {
      const x = p.x + c[0];
      const y = p.y + c[1];
      assert(x >= 0 && x < E.W && y >= 0 && y < E.H, 'piece out of board');
      assert(s.board[y][x] === 0, 'piece inside locked cell');
      const k = x + ',' + y;
      assert(!seen[k], 'two pieces share a cell');
      seen[k] = true;
    }
  }
}

// *-*-*-*-*-*-*-*-*-*-*-* random play never breaks the rules *-*-*-*-*-*-*-*-*-*-*-*
const ACTIONS = ['L', 'R', 'D', 'rot', 'drop'];
let games = 0;
let totalLines = 0;
let s = E.newGame(['a', 'b']);
for (let i = 0; i < 200000; i++) {
  if (Math.random() < 0.5) {
    E.input(s, Math.random() < 0.5 ? 0 : 1, ACTIONS[Math.floor(Math.random() * 4.2)]);
  }
  E.step(s, 16);
  if (!s.over) { overlapCheck(s); }
  if (s.over) {
    games++;
    totalLines += s.lines;
    s = E.newGame(['a', 'b']);
  }
}
assert(games > 0, 'random play should end some games');

// *-*-*-*-*-*-*-*-*-*-*-* a full row clears and counts for the player who closed it *-*-*-*-*-*-*-*-*-*-*-*
s = E.newGame(['a', 'b']);
for (let x = 0; x < E.W - 3; x++) { s.board[E.H - 1][x] = 1; }
s.players[1].next = { kind: 'bar3', cells: [[0, 0], [1, 0], [2, 0]] };
E.step(s, 16);
const p = s.players[1].piece;
assert.strictEqual(p.kind, 'bar3');
while (p.x < E.W - 3) { assert(E.input(s, 1, 'R')); }
E.input(s, 1, 'drop');
assert(s.clearing && s.clearing.rows[0] === E.H - 1, 'row should be clearing');
for (let i = 0; i < 40; i++) { E.step(s, 16); }
assert.strictEqual(s.lines, 1);
assert.strictEqual(s.players[1].lines, 1);
assert.strictEqual(s.players[0].lines, 0);
assert.strictEqual(s.score >= 100, true);
assert(s.board[E.H - 1].every(function (v) { return v === 0; }), 'bottom row empty after clear');

// *-*-*-*-*-*-*-*-*-*-*-* a piece resting on the partner's piece does not lock *-*-*-*-*-*-*-*-*-*-*-*
s = E.newGame(['a', 'b']);
s.players[0].next = { kind: 'box', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] };
s.players[1].next = { kind: 'box', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] };
E.step(s, 16);
const a = s.players[0].piece;
const b = s.players[1].piece;
for (let i = 0; i < 4; i++) { E.input(s, 1, 'D'); }
while (a.x < b.x) { E.input(s, 0, 'R'); }
assert.strictEqual(a.x, b.x);
E.input(s, 0, 'drop');
assert(s.players[0].piece === a, 'top piece must stay alive on top of partner');
assert.strictEqual(a.y + 2, b.y);

console.log('engine ok, random games finished: ' + games + ', lines cleared by random play: ' + totalLines);

// *-*-*-*-*-*-*-*-*-*-*-* a row built by both players pays the together bonus, a solo row does not *-*-*-*-*-*-*-*-*-*-*-*
assert.strictEqual(s.together, 0);
function closeRow(owner) {
  const g = E.newGame(['a', 'b']);
  for (let x = 0; x < E.W - 3; x++) { g.board[E.H - 1][x] = owner; }
  g.players[1].next = { kind: 'bar3', cells: [[0, 0], [1, 0], [2, 0]] };
  E.step(g, 16);
  while (g.players[1].piece.x < E.W - 3) { E.input(g, 1, 'R'); }
  const before = g.score;
  E.input(g, 1, 'drop');
  const dropPoints = g.score - before;
  for (let i = 0; i < 40; i++) { E.step(g, 16); }
  return { gain: g.score - before - dropPoints, together: g.together };
}
const mixedRow = closeRow(1);
const soloRow = closeRow(2);
assert.strictEqual(soloRow.gain, 100);
assert.strictEqual(soloRow.together, 0);
assert.strictEqual(mixedRow.gain, 250);
assert.strictEqual(mixedRow.together, 1);

// *-*-*-*-*-*-*-*-*-*-*-* swap trades the two upcoming pieces, once per piece *-*-*-*-*-*-*-*-*-*-*-*
s = E.newGame(['a', 'b']);
E.step(s, 16);
const n0 = s.players[0].next.kind;
const n1 = s.players[1].next.kind;
s.players[0].next.kind = 'mine';
s.players[1].next.kind = 'yours';
assert(E.input(s, 0, 'swap'));
assert.strictEqual(s.players[0].next.kind, 'yours');
assert.strictEqual(s.players[1].next.kind, 'mine');
assert(!E.input(s, 0, 'swap'), 'second swap on the same piece must be refused');
assert(E.input(s, 1, 'swap'), 'the partner still has their own swap');
s.players[0].next.kind = n0;
s.players[1].next.kind = n1;

// *-*-*-*-*-*-*-*-*-*-*-* two bots must actually clear rows *-*-*-*-*-*-*-*-*-*-*-*
const Bot = require('../bot.js');
let botLines = 0;
let botGames = 0;
s = E.newGame(['a', 'b']);
for (let i = 0; i < 60000 && botGames < 5; i++) {
  if (i % 6 === 0) {
    const who = (i / 6) % 2;
    const act = Bot.act(s, who);
    if (act && !E.input(s, who, act)) { E.input(s, who, 'D'); }
  }
  E.step(s, 16);
  if (!s.over) { overlapCheck(s); }
  if (s.over) {
    botGames++;
    botLines += s.lines;
    s = E.newGame(['a', 'b']);
  }
}
botLines += s.lines;
assert(botLines >= 20, 'bots cleared only ' + botLines + ' rows');
console.log('bots ok, rows cleared: ' + botLines + ' in ' + (botGames + 1) + ' games');
