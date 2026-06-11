import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@telemetry/common';
import { AlertsQuery, AlertsQuerySchema, AlertsService, AlertSummary } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Query(new ZodValidationPipe(AlertsQuerySchema)) query: AlertsQuery): Promise<AlertSummary[]> {
    return this.alertsService.findAll(query);
  }
}
