import { Module } from '@nestjs/common';
import { SpaceWeatherService } from './telemetry/spaceweather.service';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryGateway } from './telemetry/telemetry.gateway';
import { TelemetryService } from './telemetry/telemetry.service';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryGateway, SpaceWeatherService],
})
export class AppModule {}
