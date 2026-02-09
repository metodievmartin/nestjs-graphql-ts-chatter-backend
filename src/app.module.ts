import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { LoggerModule } from 'nestjs-pino';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatsModule } from './chats/chats.module';
import { PubSubModule } from './common/pubsub/pubsub.module';
import { envVarValidationSchema } from './common/config/app.config';
import { GqlConfigService } from './common/config/gql-config.service';
import { createLoggerConfig } from './common/config/logger.config.';

// Root module - entry point for NestJS dependency injection container
@Module({
  imports: [
    // forRoot() = singleton config for the entire app (vs forFeature() for module-specific)
    // isGlobal: true = ConfigService available everywhere without importing ConfigModule
    // validationSchema = fail-fast on startup if env vars missing (Joi validates process.env)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envVarValidationSchema,
    }),
    // GraphQL code-first approach: autoSchemaFile generates schema.graphql from decorators
    // Set autoSchemaFile: 'schema.graphql' to write to file, or `true` for in-memory only
    // driver: ApolloDriver = uses Apollo Server under the hood
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useClass: GqlConfigService,
      imports: [AuthModule],
    }),
    DatabaseModule,
    UsersModule,
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        createLoggerConfig(configService),
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
