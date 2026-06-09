import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';

export function pinoOptions(opts: { serviceName: string }): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,
      base: { service: opts.serviceName },
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing =
          (req.headers['x-request-id'] as string | undefined) ||
          (req.headers['x-correlation-id'] as string | undefined);
        const id = existing || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
          };
        },
        res(res: any) {
          return { statusCode: res.statusCode };
        },
      },
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.token', '*.password'],
        remove: true,
      },
      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === '/health' || req.url === '/metrics',
      },
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname,service',
              singleLine: true,
            },
          },
    },
  };
}
