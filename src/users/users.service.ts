import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './users.repository';
import { isErrorWithMessage } from '../common/utils/error.utils';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly usersService: UsersRepository) {}

  async create(createUserInput: CreateUserInput) {
    try {
      return await this.usersService.create({
        ...createUserInput,
        password: await this.hashPassword(createUserInput.password),
      });
    } catch (err) {
      if (isErrorWithMessage(err) && err.message.includes('E11000')) {
        throw new UnprocessableEntityException('Email already exists.');
      }
      throw err;
    }
  }

  async findAll() {
    return this.usersService.find({});
  }

  async findOne(_id: string) {
    return this.usersService.findOne({ _id: new Types.ObjectId(_id) });
  }

  async update(_id: string, updateUserInput: UpdateUserInput) {
    if (updateUserInput.password) {
      updateUserInput.password = await this.hashPassword(
        updateUserInput.password,
      );
    }

    return this.usersService.findOneAndUpdate(
      { _id: new Types.ObjectId(_id) },
      {
        $set: {
          ...updateUserInput,
        },
      },
    );
  }

  remove(_id: string) {
    return this.usersService.findOneAndDelete({ _id: new Types.ObjectId(_id) });
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private async comparePassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }
}
