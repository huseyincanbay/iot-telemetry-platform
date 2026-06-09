import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { IApiResponse } from '@telemetry/types';

const PROD_FALLBACK_MESSAGE = 'Internal server error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = PROD_FALLBACK_MESSAGE;
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const resp = payload as { message?: string | string[] };
        if (Array.isArray(resp.message)) {
          errors = resp.message;
          message = 'Validation failed';
        } else if (resp.message) {
          message = resp.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      message = this.isProduction ? PROD_FALLBACK_MESSAGE : exception.message;
    } else {
      this.logger.error(`Unhandled non-Error exception: ${String(exception)}`);
    }

    const body: IApiResponse = {
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(`${request.method} ${request.url} -> ${status} | ${message}`);
    response.status(status).json(body);
  }
}
