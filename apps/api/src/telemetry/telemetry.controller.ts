import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { SpaceWeatherService } from './spaceweather.service';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  constructor(
    @Inject(TelemetryService) private readonly svc: TelemetryService,
    @Inject(SpaceWeatherService) private readonly weather: SpaceWeatherService,
  ) {}

  /** Real NOAA GOES proton flux (cached 60 s); `{ ok: false }` when NOAA was never reachable. */
  @Get('spaceweather')
  spaceweather() {
    return this.weather.get();
  }

  @Get('telemetry/latest')
  latest() {
    return this.svc.peek();
  }

  @Get('scenarios')
  scenarios() {
    const { crew, meta, thresholdsProvisional } = this.svc.snapshot();
    return { meta, crew, thresholdsProvisional, flares: this.svc.flares() };
  }

  @Post('reset')
  reset() {
    this.svc.reset();
    return { ok: true };
  }

  @Post('events')
  event(@Body() body: unknown) {
    return this.svc.command(body);
  }
}
