import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly requestsTotal: Counter<string>;
  private readonly requestDuration: Histogram<string>;
  private readonly requestsInProgress: Gauge<string>;

  constructor(register: Registry) {
    this.requestsTotal =
      (register.getSingleMetric('http_requests_total') as Counter<string> | undefined) ??
      new Counter({
        name: 'http_requests_total',
        help: 'Total HTTP requests received',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register],
      });

    this.requestDuration =
      (register.getSingleMetric('http_request_duration_seconds') as
        | Histogram<string>
        | undefined) ??
      new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [register],
      });

    this.requestsInProgress =
      (register.getSingleMetric('http_requests_in_progress') as Gauge<string> | undefined) ??
      new Gauge({
        name: 'http_requests_in_progress',
        help: 'In-flight HTTP requests',
        labelNames: ['method', 'route'],
        registers: [register],
      });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();
    const res = httpCtx.getResponse();

    const method = (req.method as string) || 'UNKNOWN';
    const route = this.resolveRoute(req);

    this.requestsInProgress.inc({ method, route });
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const durationSec = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const statusCode = String(res.statusCode ?? 200);
        this.requestsTotal.inc({ method, route, status_code: statusCode });
        this.requestDuration.observe({ method, route, status_code: statusCode }, durationSec);
        this.requestsInProgress.dec({ method, route });
      }),
    );
  }

  private resolveRoute(req: { baseUrl?: string; route?: { path?: string } }): string {
    const baseUrl = req.baseUrl ?? '';
    const path = req.route?.path ?? '';
    return path ? `${baseUrl}${path}` : 'unknown';
  }
}
