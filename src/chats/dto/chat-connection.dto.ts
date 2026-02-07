import { ObjectType, Field } from '@nestjs/graphql';
import { Chat } from '../entities/chat.entity';

@ObjectType()
export class ChatEdge {
  @Field()
  cursor: string;

  @Field(() => Chat)
  node: Chat;
}

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class ChatConnection {
  @Field(() => [ChatEdge])
  edges: ChatEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}