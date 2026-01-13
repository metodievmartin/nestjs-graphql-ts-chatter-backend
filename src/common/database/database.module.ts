import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    // forRootAsync = async config (waits for ConfigService to be ready)
    // useFactory + inject = NestJS pattern for injecting dependencies into factory functions
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService], // Dependencies to inject into useFactory (order matters)
    }),
  ],
})
export class DatabaseModule {
  // Static module pattern: wraps MongooseModule.forFeature for cleaner imports in feature modules
  // Usage: DatabaseModule.forFeature([{ name: User.name, schema: UserSchema }])
  static forFeature(models: ModelDefinition[]) {
    return MongooseModule.forFeature(models);
  }
}
