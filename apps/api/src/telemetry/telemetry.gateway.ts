import { Inject, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  type OnGatewayConnection, type OnGatewayDisconnect, SubscribeMessage, WebSocketGateway,
} from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { TelemetryService } from './telemetry.service';

@WebSocketGateway({ path: '/ws' })
export class TelemetryGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('TelemetryGateway');
  private clients = new Set<WebSocket>();
  private timer?: NodeJS.Timeout;
  private beat = 0;

  constructor(@Inject(TelemetryService) private readonly svc: TelemetryService) {}

  onModuleInit() {
    this.timer = setInterval(() => this.broadcastTick(), 100);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  handleConnection(client: WebSocket) {
    this.clients.add(client);
    client.send(JSON.stringify({ type: 'hello', ...this.svc.snapshot() }));
    this.log.log(`client connected (${this.clients.size})`);
  }
  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
  }

  @SubscribeMessage('command')
  onCommand(_client: WebSocket, data: unknown) {
    return { event: 'ack', data: this.svc.command(data) };
  }

  private broadcastTick() {
    // advance status/alert state even when nobody is connected
    const { t, frames, alerts } = this.svc.tick();
    if (!this.clients.size) return;
    const msgs = [JSON.stringify({ type: 'frames', t, frames, alerts })];
    if (++this.beat % 10 === 0) msgs.push(JSON.stringify({ type: 'heartbeat', t }));
    for (const c of this.clients) {
      if (c.readyState !== 1) continue;
      for (const m of msgs) c.send(m);
    }
  }
}
