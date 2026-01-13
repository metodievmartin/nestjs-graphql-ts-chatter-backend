import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository } from '../common/database/abstract.repository';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository extends AbstractRepository<User> {
  // Satisfies `protected abstract readonly logger` from AbstractRepository
  protected readonly logger = new Logger(UsersRepository.name);

  // @InjectModel() = injects Mongoose model registered in module's forFeature()
  // Token must match: User.name here === name in DatabaseModule.forFeature()
  constructor(@InjectModel(User.name) userModel: Model<User>) {
    super(userModel);
  }
}
