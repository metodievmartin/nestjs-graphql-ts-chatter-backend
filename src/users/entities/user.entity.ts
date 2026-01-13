import { Field, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { AbstractEntity } from '../../common/database/abstract.entity';

// versionKey: false = disables Mongoose's __v field (tracks document revisions)
@Schema({ versionKey: false })
@ObjectType() // No isAbstract = this becomes a concrete GraphQL type "User"
export class User extends AbstractEntity {
  @Prop()
  @Field() // Exposed in GraphQL schema
  email: string;

  @Prop()
  // No @Field() = password stays in DB but hidden from GraphQL responses
  password: string;
}

// Converts class with decorators into actual Mongoose schema
// Must be exported for use in module registration
export const UserSchema = SchemaFactory.createForClass(User);
