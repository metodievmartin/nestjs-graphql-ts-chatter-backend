import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsStrongPassword } from 'class-validator';

// @InputType() = GraphQL input type (for mutations/query args)
// Different from @ObjectType() which is for output types
// In schema: input CreateUserInput { ... } vs type User { ... }
@InputType()
export class CreateUserInput {
  @Field() // Required in GraphQL schema (use @Field({ nullable: true }) for optional)
  @IsEmail() // class-validator: validated by ValidationPipe in main.ts
  email: string;

  @Field()
  @IsNotEmpty()
  username: string;

  @Field()
  @IsStrongPassword() // Enforces: minLength 8, 1 lowercase, 1 uppercase, 1 number, 1 symbol
  password: string;
}
