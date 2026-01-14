import Joi from 'joi';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { LoggerModule } from 'nestjs-pino';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './users/users.module';
import { GRAPHQL_PATH } from './common/constants';
import { AuthModule } from './auth/auth.module';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: GRAPHQL_PATH,
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
  ],
  controllers: [AppController], // REST controllers (GraphQL uses resolvers instead)
  providers: [AppService], // Services injectable within this module
})
export class AppModule {}
