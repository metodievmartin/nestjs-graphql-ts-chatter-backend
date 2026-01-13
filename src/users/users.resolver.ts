import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

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
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.usersService.create(createUserInput);
  }

  // @Query(() => [User]) = returns array of User
  // { name: 'users' } = override schema name (otherwise would be "findAll")
  @Query(() => [User], { name: 'users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('_id') _id: string) {
    return this.usersService.findOne(_id);
  }

  @Mutation(() => User)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    return this.usersService.update(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => User)
  removeUser(@Args('_id') _id: string) {
    return this.usersService.remove(_id);
  }
}
