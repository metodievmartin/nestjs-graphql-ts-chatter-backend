import { Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UsersRepository } from './users.repository';
import { DatabaseModule } from '../common/database/database.module';
import { User, UserSchema } from './entities/user.entity';

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
  ],
  // providers = injectable classes for this module's DI container
  // Order doesn't matter - NestJS resolves dependency graph automatically
  // No controllers here: GraphQL uses Resolvers instead of REST Controllers
  providers: [UsersResolver, UsersService, UsersRepository],
})
export class UsersModule {}
