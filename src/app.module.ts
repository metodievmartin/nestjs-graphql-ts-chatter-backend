import Joi from 'joi';
import { Logger, Module, UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { LoggerModule } from 'nestjs-pino';
import { type Request } from 'express';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './users/users.module';
import { GRAPHQL_PATH } from './common/constants';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { PubSubModule } from './common/pubsub/pubsub.module';
import { AuthService } from './auth/auth.service';

// Root module - entry point for NestJS dependency injection container
@Module({
  imports: [
    // forRoot() = singleton config for the entire app (vs forFeature() for module-specific)
    // isGlobal: true = ConfigService available everywhere without importing ConfigModule
    // validationSchema = fail-fast on startup if env vars missing (Joi validates process.env)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(8080),
        MONGODB_URI: Joi.string().required(),
        DB_NAME: Joi.string().required(),
      }),
    }),
    // GraphQL code-first approach: autoSchemaFile generates schema.graphql from decorators
    // Set autoSchemaFile: 'schema.graphql' to write to file, or `true` for in-memory only
    // driver: ApolloDriver = uses Apollo Server under the hood
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (authService: AuthService) => ({
        autoSchemaFile: true,
        path: GRAPHQL_PATH,
        subscriptions: {
          'graphql-ws': {
            path: GRAPHQL_PATH,
            onConnect: (context: any) => {
              try {
                // const request: Request = context.extra.request;
                // const user = authService.verifyWs(request);
                // context.extra.user = user;
                const request: Request = context.extra.request;
                const user = authService.verifyWs(request);
                context.user = user;
              } catch (e) {
                new Logger().error(e);
                throw new UnauthorizedException();
              }
            },
          },
        },
      }),
      imports: [AuthModule],
      inject: [AuthService],
    }),
    DatabaseModule,
    UsersModule,
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
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
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ChatsModule,
    PubSubModule,
  ],
  controllers: [AppController], // REST controllers (GraphQL uses resolvers instead)
  providers: [AppService], // Services injectable within this module
})
export class AppModule {}
