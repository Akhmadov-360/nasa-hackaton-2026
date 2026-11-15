import { Module } from '@nestjs/common';
import { SessionRegistry } from './telemetry/session.registry';
import { SpaceWeatherService } from './telemetry/spaceweather.service';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryGateway } from './telemetry/telemetry.gateway';

@Module({
  controllers: [TelemetryController],
  providers: [{ provide: SessionRegistry, useFactory: () => new SessionRegistry() }, TelemetryGateway, SpaceWeatherService],
})
export class AppModule {}
