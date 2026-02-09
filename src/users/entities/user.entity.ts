import { Field, ObjectType } from '@nestjs/graphql';

import { AbstractEntity } from '../../common/database/abstract.entity';

@ObjectType() // No isAbstract = this becomes a concrete GraphQL type "User"
export class User extends AbstractEntity {
  @Field() // Exposed in GraphQL schema
  email: string;

  @Field()
  username: string;

  @Field()
  imageUrl: string;
}
