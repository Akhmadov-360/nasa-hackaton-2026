import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  constructor(@Inject(TelemetryService) private readonly svc: TelemetryService) {}

  @Get('telemetry/latest')
  latest() {
    const { t, frames } = this.svc.tick();
    return { t, frames };
  }

  @Get('scenarios')
  scenarios() {
    const { crew, meta, thresholdsProvisional } = this.svc.snapshot();
    return { meta, crew, thresholdsProvisional, flares: this.svc.flares() };
  }

  @Post('events')
  event(@Body() body: unknown) {
    return this.svc.command(body);
  }
}
