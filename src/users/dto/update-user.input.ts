import { InputType, PartialType } from '@nestjs/graphql';

import { CreateUserInput } from './create-user.input';

@InputType()
// PartialType() = NestJS utility that makes all inherited fields optional
// Also preserves @Field() decorators with { nullable: true }
// Copies validation decorators too
export class UpdateUserInput extends PartialType(CreateUserInput) {}
