import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersRepository } from './users.repository';
import { isErrorWithMessage } from '../common/utils/error.utils';
import { S3Service } from '../common/s3/s3.service';
import { USERS_S3_BUCKET, USERS_IMAGE_FILE_EXTENSION } from './users.constants';
import { UserDocument } from './entities/user.document';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(createUserInput: CreateUserInput) {
    try {
      return this.toEntity(
        await this.usersRepository.create({
          ...createUserInput,
          password: await this.hashPassword(createUserInput.password),
        }),
      );
    } catch (err) {
      if (isErrorWithMessage(err) && err.message.includes('E11000')) {
        throw new UnprocessableEntityException('Email already exists.');
      }
      throw err;
    }
  }

  async findAll() {
    return (await this.usersRepository.find({})).map((userDocument) =>
      this.toEntity(userDocument),
    );
  }

  async findOne(_id: string) {
    return this.toEntity(
      await this.usersRepository.findOne({ _id: new Types.ObjectId(_id) }),
    );
  }

  async update(_id: string, updateUserInput: UpdateUserInput) {
    if (updateUserInput.password) {
      updateUserInput.password = await this.hashPassword(
        updateUserInput.password,
      );
    }

    return this.toEntity(
      await this.usersRepository.findOneAndUpdate(
        { _id: new Types.ObjectId(_id) },
        {
          $set: {
            ...updateUserInput,
          },
        },
      ),
    );
  }

  async remove(_id: string) {
    return this.toEntity(
      await this.usersRepository.findOneAndDelete({
        _id: new Types.ObjectId(_id),
      }),
    );
  }

  async verifyUser(email: string, password: string) {
    const user = await this.usersRepository.findOne({ email });
    const isPasswordValid = await this.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toEntity(user);
  }

  async uploadImage(file: Buffer, userId: string): Promise<string> {
    const key = this.getUserImageKey(userId);
    await this.s3Service.upload({
      bucket: USERS_S3_BUCKET,
      key,
      file,
    });

    return this.s3Service.getObjectUrl(USERS_S3_BUCKET, key);
  }

  toEntity(userDocument: UserDocument): User {
    return {
      _id: userDocument._id,
      email: userDocument.email,
      username: userDocument.username,
      imageUrl: this.s3Service.getObjectUrl(
        USERS_S3_BUCKET,
        this.getUserImageKey(userDocument._id.toHexString()),
      ),
    };
  }

  private getUserImageKey(userId: string) {
    return `${userId}.${USERS_IMAGE_FILE_EXTENSION}`;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private async comparePasswords(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }
}
