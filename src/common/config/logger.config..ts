import { ConfigService } from '@nestjs/config';

export const createLoggerConfig = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    pinoHttp: {
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
            },
          },
      level: isProduction ? 'info' : 'debug',
    },
  };
};
