// the link between the two players. every socket goes to the room relay (relay/worker.js),
// so it works the same on home wifi, mobile data and school networks.
(function (root) {
  'use strict';
  // on a developer machine ?relay=host:port points the page at a relay running there.
  const LOCAL = /^(localhost|127\.|10\.|192\.168\.|172\.)/.test(location.hostname) ? new URLSearchParams(location.search).get('relay') : null;
  const BASE = LOCAL ? 'ws://' + LOCAL + '/r/' : 'wss://idkname-relay.damummyphus.workers.dev/r/';
  const LIVE = LOCAL ? 'http://' + LOCAL + '/live' : 'https://idkname-relay.damummyphus.workers.dev/live';
  const OPEN_WAIT_MS = 8000;

  function emitter(o) {
    const handlers = {};
    o.on = function (name, fn) {
      (handlers[name] = handlers[name] || []).push(fn);
      return o;
    };
    o._emit = function (name, arg) {
      for (const fn of (handlers[name] || []).slice()) { fn(arg); }
    };
    return o;
  }

  function randomKey() {
    const a = new Uint8Array(12);
    crypto.getRandomValues(a);
    return Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // *-*-*-*-*-*-*-*-*-*-*-* guest *-*-*-*-*-*-*-*-*-*-*-*
  // one link to the host. 'open' once seated, then 'data' and 'close'; 'error' if it never got a seat.
  function join(code) {
    const link = emitter({ open: false });
    const ws = new WebSocket(BASE + code + '?role=guest');
    let seated = false;
    let done = false;
    const fail = function (type) {
      if (done) { return; }
      done = true;
      link.open = false;
      link._emit(seated ? 'close' : 'error', { type: type });
    };
    const timer = setTimeout(function () {
      if (!seated) {
        try { ws.close(); } catch (e) { /* never opened */ }
        fail('network');
      }
    }, OPEN_WAIT_MS);
    ws.onmessage = function (ev) {
      if (!seated) {
        if (ev.data !== 'ok') { return; }
        seated = true;
        clearTimeout(timer);
        link.open = true;
        link._emit('open');
        return;
      }
      let m = null;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      link._emit('data', m);
    };
    ws.onclose = function (ev) {
      clearTimeout(timer);
      fail(ev.code === 4004 ? 'peer-unavailable' : ev.code === 4001 ? 'full' : 'network');
    };
    link.send = function (obj) {
      if (ws.readyState === 1) { ws.send(JSON.stringify(obj)); }
    };
    link.close = function () {
      try { ws.close(); } catch (e) { /* already gone */ }
      fail('closed');
    };
    return link;
  }

  // *-*-*-*-*-*-*-*-*-*-*-* host *-*-*-*-*-*-*-*-*-*-*-*
  // holds the room. 'open' once the code is ours, 'connection' for every guest link, 'error' if the code is taken.
  // if the socket drops it comes back with the same key and the guests stay seated.
  function host(code) {
    const room = emitter({ destroyed: false });
    const key = randomKey();
    const links = {};
    let ws = null;
    let everOpen = false;

    const drop = function (id) {
      const link = links[id];
      if (!link) { return; }
      delete links[id];
      link.open = false;
      link._emit('close');
    };

    const add = function (id) {
      if (links[id]) { return; }
      const link = emitter({ open: true });
      link.send = function (obj) {
        if (link.open && ws && ws.readyState === 1) { ws.send(id + '\n' + JSON.stringify(obj)); }
      };
      link.close = function () {
        if (ws && ws.readyState === 1) { ws.send('!' + id); }
        drop(id);
      };
      links[id] = link;
      room._emit('connection', link);
      link._emit('open');
    };

    const connect = function () {
      let seated = false;
      ws = new WebSocket(BASE + code + '?role=host&key=' + key);
      ws.onmessage = function (ev) {
        const d = ev.data;
        if (!seated) {
          if (d !== 'ok') { return; }
          seated = true;
          if (!everOpen) {
            everOpen = true;
            room._emit('open');
          }
          return;
        }
        if (d[0] === '+') {
          add(d.slice(1));
          return;
        }
        if (d[0] === '-') {
          drop(d.slice(1));
          return;
        }
        const cut = d.indexOf('\n');
        const link = links[d.slice(0, cut)];
        if (!link) { return; }
        let m = null;
        try { m = JSON.parse(d.slice(cut + 1)); } catch (e) { return; }
        link._emit('data', m);
      };
      ws.onclose = function (ev) {
        if (room.destroyed) { return; }
        if (!everOpen) {
          room._emit('error', { type: ev.code === 4001 ? 'unavailable-id' : 'network' });
          return;
        }
        setTimeout(function () {
          if (!room.destroyed) { connect(); }
        }, 1000);
      };
    };

    room.destroy = function () {
      room.destroyed = true;
      try { ws.close(); } catch (e) { /* already gone */ }
    };
    connect();
    return room;
  }

  root.Net = { host: host, join: join, LIVE: LIVE };
})(window);
