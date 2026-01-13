import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { config, database, up } from 'migrate-mongo';

// Runs DB migrations automatically on app startup.
// *Convenient for dev, but in production migrations should be run separately
@Injectable()
export class DbMigrationService implements OnModuleInit {
  // OnModuleInit = NestJS lifecycle hook interface
  // Other lifecycle hooks: OnModuleDestroy, OnApplicationBootstrap, OnApplicationShutdown
  // Execution order: constructor → onModuleInit → onApplicationBootstrap → app ready

  private readonly dbMigrationConfig: Partial<config.Config>;

  constructor(private readonly configService: ConfigService) {
    this.dbMigrationConfig = {
      mongodb: {
        databaseName: this.configService.getOrThrow('DB_NAME'),
        url: this.configService.getOrThrow('MONGODB_URI'),
      },
      migrationsDir: `${__dirname}/../../migrations`,
      changelogCollectionName: 'changelog', // MongoDB collection tracking applied migrations
      migrationFileExtension: '.js', // Compiled JS, not TS (runs from dist/)
    };
  }

  // Called once when the host module is initialized (all dependencies resolved)
  // Can be async - NestJS waits for it to complete before proceeding
  // If this throws, the app fails to start (good for critical setup)
  async onModuleInit() {
    // Types say these are namespaces, but at runtime they're wrapped due to ESM/CJS interop.
    // The awaits resolve the actual module exports. Types are inaccurate here.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { set } = await config;
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { connect } = await database;
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const migrateUp = await up;

    set(this.dbMigrationConfig);
    const { db, client } = await connect();
    await migrateUp(db, client); // Runs all pending migrations
  }
}
