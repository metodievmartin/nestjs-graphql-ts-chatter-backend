import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type TokenPayload } from '../auth/types/token-payload.interface';
import { Types } from 'mongoose';

// Resolver = GraphQL equivalent of REST Controller
// @Resolver(() => User) = declares this resolver handles User type operations
// Enables field resolvers for User if needed (e.g., @ResolveField())
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // @Mutation(() => User) = GraphQL mutation returning User type
  // Method name becomes mutation name in schema unless overridden
  // @Args('name') = extracts named argument from GraphQL operation
  @Mutation(() => User)
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.usersService.create(createUserInput);
  }

  // @Query(() => [User]) = returns array of User
  // { name: 'users' } = override schema name (otherwise would be "findAll")
  @Query(() => [User], { name: 'users' })
  @UseGuards(GqlAuthGuard)
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  @UseGuards(GqlAuthGuard)
  async findOne(@Args('_id') _id: string): Promise<User> {
    return this.usersService.findOne(_id);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() user: TokenPayload,
  ): Promise<User> {
    return this.usersService.update(user._id, updateUserInput);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async removeUser(@CurrentUser() user: TokenPayload): Promise<User> {
    return this.usersService.remove(user._id);
  }

  @Query(() => User, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: TokenPayload): Promise<User> {
    return { ...user, _id: new Types.ObjectId(user._id) };
  }
}
