// room relay for idkname. one durable object per room code.
// the host and the guests each hold one websocket to the room; the room only forwards text between them.
//   host  -> room : "<guest id>\n<payload>"   forwarded to that guest as "<payload>"
//   guest -> room : "<payload>"               forwarded to the host as "<guest id>\n<payload>"
//   room  -> host : "+<guest id>" a guest arrived, "-<guest id>" a guest left
//   room  -> anyone : "ok" first, once the socket has its seat
// close codes: 4001 the code is taken, 4004 no such room, 4005 the host left.
import { DurableObject } from 'cloudflare:workers';

const ORIGIN_OK = /^(https:\/\/idkname\.vercel\.app|https:\/\/idkname-[a-z0-9-]+\.vercel\.app|http:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?)$/;
const HOST_GRACE_MS = 60000;

export class Room extends DurableObject {
  host() {
    for (const ws of this.ctx.getWebSockets('host')) {
      if (ws.readyState === 1) { return ws; }
    }
    return null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    if (role === 'host') {
      const key = (url.searchParams.get('key') || '').slice(0, 64);
      const saved = await this.ctx.storage.get('host');
      const old = this.host();
      const mine = saved && saved.key === key;
      const free = !saved || (!old && Date.now() - saved.seen > HOST_GRACE_MS);
      if (!key || (!mine && !free)) {
        server.accept();
        server.close(4001, 'taken');
        return new Response(null, { status: 101, webSocket: client });
      }
      if (!mine) {
        for (const g of this.ctx.getWebSockets('guest')) {
          try { g.close(4005, 'host left'); } catch (e) { /* already closed */ }
        }
      }
      if (old) {
        try { old.close(4001, 'replaced'); } catch (e) { /* already closed */ }
      }
      await this.ctx.storage.put('host', { key: key, seen: Date.now() });
      this.ctx.acceptWebSocket(server, ['host']);
      server.serializeAttachment({ role: 'host' });
      server.send('ok');
      // tell a returning host who is still in the room.
      for (const g of this.ctx.getWebSockets('guest')) {
        const a = g.deserializeAttachment();
        if (a && a.id && g.readyState === 1) { server.send('+' + a.id); }
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    const host = this.host();
    if (!host) {
      server.accept();
      server.close(4004, 'no room');
      return new Response(null, { status: 101, webSocket: client });
    }
    if (this.ctx.getWebSockets('guest').length >= 16) {
      server.accept();
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const id = crypto.randomUUID().slice(0, 8);
    this.ctx.acceptWebSocket(server, ['guest', 'g:' + id]);
    server.serializeAttachment({ role: 'guest', id: id });
    server.send('ok');
    host.send('+' + id);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string') { return; }
    const a = ws.deserializeAttachment();
    if (!a) { return; }
    if (a.role === 'host') {
      if (msg[0] === '!') {
        for (const g of this.ctx.getWebSockets('g:' + msg.slice(1))) { g.close(4005, 'closed by host'); }
        return;
      }
      const cut = msg.indexOf('\n');
      if (cut < 1) { return; }
      const payload = msg.slice(cut + 1);
      for (const g of this.ctx.getWebSockets('g:' + msg.slice(0, cut))) {
        try { g.send(payload); } catch (e) { /* gone */ }
      }
      return;
    }
    const host = this.host();
    if (host) {
      try { host.send(a.id + '\n' + msg); } catch (e) { /* gone */ }
    }
  }

  async webSocketClose(ws, code) {
    const a = ws.deserializeAttachment();
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch (e) { /* already closed */ }
    if (!a) { return; }
    if (a.role === 'guest') {
      const host = this.host();
      if (host) {
        try { host.send('-' + a.id); } catch (e) { /* gone */ }
      }
      return;
    }
    // the host socket closed. guests stay; the host may come back with the same key.
    if (this.host()) { return; }
    const saved = await this.ctx.storage.get('host');
    if (saved) { await this.ctx.storage.put('host', { key: saved.key, seen: Date.now() }); }
  }

  webSocketError(ws) {
    return this.webSocketClose(ws, 1011);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/r\/([A-Z]{4})$/);
    if (!m) { return new Response('idkname relay', { status: 200 }); }
    if (request.headers.get('Upgrade') !== 'websocket') { return new Response('websocket only', { status: 426 }); }
    const origin = request.headers.get('Origin') || '';
    if (!ORIGIN_OK.test(origin)) { return new Response('forbidden', { status: 403 }); }
    return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(request);
  }
};
