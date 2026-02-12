import { ObjectType, Field } from '@nestjs/graphql';

import { Message } from '../messages/entities/message.entity';
import { AbstractEntity } from '../../common/database/abstract.entity';

@ObjectType()
export class Chat extends AbstractEntity {
  @Field()
  name: string;

  @Field()
  isPrivate: boolean;

  @Field(() => [String])
  userIds: string[];

  @Field(() => Message, { nullable: true })
  latestMessage?: Message;

  @Field()
  createdAt: Date;
}
