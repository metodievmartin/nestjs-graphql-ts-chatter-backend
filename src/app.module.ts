import Joi from 'joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './users/users.module';

// Root module - entry point for NestJS dependency injection container
@Module({
  imports: [
    // forRoot() = singleton config for the entire app (vs forFeature() for module-specific)
    // isGlobal: true = ConfigService available everywhere without importing ConfigModule
    // validationSchema = fail-fast on startup if env vars missing (Joi validates process.env)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
      }),
    }),
    // GraphQL code-first approach: autoSchemaFile generates schema.graphql from decorators
    // Set autoSchemaFile: 'schema.graphql' to write to file, or `true` for in-memory only
    // driver: ApolloDriver = uses Apollo Server under the hood
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [AppController], // REST controllers (GraphQL uses resolvers instead)
  providers: [AppService], // Services injectable within this module
})
export class AppModule {}
