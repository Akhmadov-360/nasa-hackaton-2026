import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryGateway } from './telemetry/telemetry.gateway';
import { TelemetryService } from './telemetry/telemetry.service';

@Module({
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryGateway],
})
export class AppModule {}
