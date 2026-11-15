import { BadRequestException, Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { SpaceWeatherService } from './spaceweather.service';
import { SessionRegistry } from './session.registry';
import type { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  constructor(
    @Inject(SessionRegistry) private readonly sessions: SessionRegistry,
    @Inject(SpaceWeatherService) private readonly weather: SpaceWeatherService,
  ) {}

  /** The visitor's own simulation (`?sid=`); without a sid, the shared `default` one used by local scripts. */
  private svc(sid: unknown): TelemetryService {
    const id = SessionRegistry.normalise(sid);
    if (!id) throw new BadRequestException('invalid sid');
    return this.sessions.get(id);
  }

  /** A readable answer at the root, so opening the service address in a browser says what it is. */
  @Get()
  root() {
    return {
      name: 'astronaut-health-monitor-api',
      status: 'ok',
      websocket: '/ws',
      rest: ['GET /telemetry/latest', 'GET /scenarios', 'GET /spaceweather', 'POST /events', 'POST /reset'],
      note: 'every visitor has a separate simulation: pass ?sid=<8-40 letters, digits, - or _>',
      web: 'https://astronaut-health-monitor-one.vercel.app',
    };
  }

  /** Real NOAA GOES proton flux (cached 60 s); `{ ok: false }` when NOAA was never reachable. */
  @Get('spaceweather')
  spaceweather() {
    return this.weather.get();
  }

  @Get('telemetry/latest')
  latest(@Query('sid') sid?: string) {
    return this.svc(sid).peek();
  }

  @Get('scenarios')
  scenarios() {
    const svc = this.sessions.get('default');
    const { crew, meta, thresholdsProvisional } = svc.snapshot();
    return { meta, crew, thresholdsProvisional, flares: svc.flares() };
  }

  @Post('reset')
  reset(@Query('sid') sid?: string) {
    this.svc(sid).reset();
    return { ok: true };
  }

  @Post('events')
  event(@Body() body: unknown, @Query('sid') sid?: string) {
    return this.svc(sid).command(body);
  }
}
