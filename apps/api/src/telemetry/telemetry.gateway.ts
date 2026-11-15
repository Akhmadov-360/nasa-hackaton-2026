import { Inject, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection, type OnGatewayDisconnect, SubscribeMessage, WebSocketGateway,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';
import { SessionRegistry } from './session.registry';

@WebSocketGateway({ path: '/ws' })
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('TelemetryGateway');
  /** each connection belongs to one visitor session (`?sid=` in the address) */
  private clients = new Map<WebSocket, string>();
  private timer?: NodeJS.Timeout;
  private beat = 0;

  constructor(@Inject(SessionRegistry) private readonly sessions: SessionRegistry) {}

  onModuleInit() {
    this.timer = setInterval(() => this.broadcastTick(), 100);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  handleConnection(client: WebSocket, req?: IncomingMessage) {
    let raw: string | null = null;
    try {
      raw = new URL(req?.url ?? '/', 'http://local').searchParams.get('sid');
    } catch { /* no address: treated as no sid */ }
    const sid = SessionRegistry.normalise(raw);
    if (!sid) {
      client.close(1008, 'invalid session id');
      return;
    }
    this.clients.set(client, sid);
    client.send(JSON.stringify({ type: 'hello', ...this.sessions.get(sid).snapshot() }));
    this.log.log(`client connected (${this.clients.size}, ${this.sessions.size} sessions)`);
  }
  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  @SubscribeMessage('command')
  onCommand(client: WebSocket, data: unknown) {
    const sid = this.clients.get(client);
    if (!sid) return { event: 'ack', data: { ok: false, error: 'no session' } };
    return { event: 'ack', data: this.sessions.get(sid).command(data) };
  }

  /** One tick per session that has a viewer; a session nobody watches is not simulated (it catches up on return). */
  private broadcastTick() {
    const bySid = new Map<string, WebSocket[]>();
    for (const [c, sid] of this.clients) {
      if (c.readyState !== 1) continue;
      (bySid.get(sid) ?? bySid.set(sid, []).get(sid)!).push(c);
    }
    const beat = ++this.beat % 10 === 0;
    for (const [sid, list] of bySid) {
      const { t, frames, alerts } = this.sessions.get(sid).tick();
      const msgs = [JSON.stringify({ type: 'frames', t, frames, alerts })];
      if (beat) msgs.push(JSON.stringify({ type: 'heartbeat', t }));
      for (const c of list) for (const m of msgs) c.send(m);
    }
    if (this.beat % 600 === 0) {
      const dropped = this.sessions.sweep();
      if (dropped) this.log.log(`dropped ${dropped} idle sessions (${this.sessions.size} left)`);
    }
  }
}
