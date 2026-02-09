import { ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { AbstractEntity } from '../../common/database/abstract.entity';

// versionKey: false = disables Mongoose's __v field (tracks document revisions)
@Schema({ versionKey: false })
@ObjectType() // No isAbstract = this becomes a concrete GraphQL type "User"
export class UserDocument extends AbstractEntity {
  @Prop()
  email: string;

  @Prop()
  username: string;

  @Prop()
  password: string;
}

// Converts class with decorators into actual Mongoose schema
// Must be exported for use in module registration
export const UserSchema = SchemaFactory.createForClass(UserDocument);
