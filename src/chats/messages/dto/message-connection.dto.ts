import { ObjectType, Field } from '@nestjs/graphql';

import { Message } from '../entities/message.entity';

@ObjectType()
export class MessageEdge {
  @Field()
  cursor: string;

  @Field(() => Message)
  node: Message;
}

@ObjectType()
export class MessagePageInfo {
  @Field()
  hasPreviousPage: boolean;

  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  startCursor?: string;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class MessageConnection {
  @Field(() => [MessageEdge])
  edges: MessageEdge[];

  @Field(() => MessagePageInfo)
  pageInfo: MessagePageInfo;
}
