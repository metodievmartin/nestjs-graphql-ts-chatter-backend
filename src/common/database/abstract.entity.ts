import { Prop, Schema } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { Field, ID, ObjectType } from '@nestjs/graphql';

// This class serves double duty: Mongoose schema + GraphQL type
// @Schema() = Mongoose decorator for defining document structure
// @ObjectType() = GraphQL decorator for exposing in schema
// isAbstract: true = won't create a separate GraphQL type, only used for inheritance
@Schema()
@ObjectType({ isAbstract: true })
export class AbstractEntity {
  // @Prop() = Mongoose field definition (type, required, default, etc.)
  // @Field() = GraphQL field exposure (use () => Type for non-primitive types)
  // ID scalar in GraphQL = string representation of MongoDB ObjectId
  @Prop({ type: SchemaTypes.ObjectId })
  @Field(() => ID)
  _id: Types.ObjectId;
}
