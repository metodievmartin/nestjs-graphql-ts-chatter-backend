import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UsersRepository } from './users.repository';
import { DatabaseModule } from '../common/database/database.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { S3Module } from '../common/s3/s3.module';
import { UserSchema } from './entities/user.document';

@Module({
  imports: [
    // Registers Mongoose model for this module - enables @InjectModel(User.name)
    // User.name = class name string "User" (used as model token)
    DatabaseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    S3Module,
  ],
  // providers = injectable classes for this module's DI container
  // Order doesn't matter - NestJS resolves dependency graph automatically
  // No controllers here: GraphQL uses Resolvers instead of REST Controllers
  providers: [UsersResolver, UsersService, UsersRepository],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
