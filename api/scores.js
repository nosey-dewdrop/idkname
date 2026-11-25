// *-*-*-*-*-*-*-*-*-*-*-* shared score table *-*-*-*-*-*-*-*-*-*-*-*
// GET  /api/scores -> { top: [{ score, rows, together, who, at }], games }, the best game of each pair and how many games were finished
// POST /api/scores { score, rows, together, who } -> { ok: true }
// every finished game is one tiny file whose name carries the whole record, so nothing is ever read-modify-written.

const { list, put } = require('@vercel/blob');

const PREFIX = 'scores/';
const MAX_SCORE = 5000000;
const TOP = 100;
const KEEP_MS = 10000;
let kept = null;

function clean(who) {
  return String(who || '').replace(/[^\p{L}\p{N} +_.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 30);
}

function toName(rec) {
  const inv = String(9999999999 - rec.score).padStart(10, '0');
  const who = Buffer.from(rec.who, 'utf8').toString('base64url');
  return PREFIX + [inv, rec.at, rec.rows, rec.together, who].join('-') + '.txt';
}

function fromName(pathname) {
  const m = /^scores\/(\d{10})-(\d+)-(\d+)-(\d+)-([A-Za-z0-9_-]+)\.txt$/.exec(pathname);
  if (!m) { return null; }
  return {
    score: 9999999999 - Number(m[1]),
    at: Number(m[2]),
    rows: Number(m[3]),
    together: Number(m[4]),
    // the computer player used to be called pix; old games show it as bot.
    who: clean(Buffer.from(m[5], 'base64url').toString('utf8')).replace(/ \+ pix$/, ' + bot')
  };
}

module.exports = async function (req, res) {
  try {
    if (req.method === 'GET') {
      // the answer is kept for a few seconds: every open game asks, and each listing of the store is counted against the plan.
      if (kept && Date.now() - kept.at < KEEP_MS) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(kept.body);
        return;
      }
      // names sort by score, so the first page holds the best games; later pages are only counted.
      const out = await list({ prefix: PREFIX, limit: 1000 });
      let games = out.blobs.length;
      let cursor = out.cursor;
      for (let i = 0; cursor && i < 50; i++) {
        const more = await list({ prefix: PREFIX, limit: 1000, cursor: cursor });
        games += more.blobs.length;
        cursor = more.cursor;
      }
      // one line per pair, their best game, so one busy pair cannot fill the whole table.
      const seen = {};
      const top = out.blobs.map(function (b) { return fromName(b.pathname); })
        .filter(Boolean)
        .sort(function (a, b) { return b.score - a.score || a.at - b.at; })
        .filter(function (r) {
          const key = r.who.toLowerCase();
          if (seen[key]) { return false; }
          seen[key] = true;
          return true;
        })
        .slice(0, TOP);
      res.setHeader('Cache-Control', 'no-store');
      kept = { at: Date.now(), body: { top: top, games: games } };
      res.status(200).json(kept.body);
      return;
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const rec = {
        score: Math.floor(Number(b.score)),
        rows: Math.floor(Number(b.rows)),
        together: Math.floor(Number(b.together)),
        who: clean(b.who),
        at: Date.now()
      };
      const sane = rec.score > 0 && rec.score <= MAX_SCORE && rec.rows >= 0 && rec.rows <= 5000 &&
        rec.together >= 0 && rec.together <= rec.rows && rec.who.length >= 3 && rec.who.indexOf(' + ') > 0;
      if (!sane) {
        res.status(400).json({ ok: false });
        return;
      }
      await put(toName(rec), '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
      kept = null;
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ ok: false });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
};
