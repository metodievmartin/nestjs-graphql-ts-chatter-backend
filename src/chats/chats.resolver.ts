import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChatsService } from './chats.service';
import { Chat } from './entities/chat.entity';
import { CreateChatInput } from './dto/create-chat.input';
import { UpdateChatInput } from './dto/update-chat.input';
import { ChatConnection, ChatEdge, PageInfo } from './dto/chat-connection.dto';
import { ForwardPaginationArgs } from '../common/dto/pagination-args.dto';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type TokenPayload } from '../auth/types/token-payload.interface';
import { encodeCursor } from '../common/utils/cursor.util';

@Resolver(() => Chat)
export class ChatsResolver {
  constructor(private readonly chatsService: ChatsService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Chat)
  createChat(
    @Args('createChatInput') createChatInput: CreateChatInput,
    @CurrentUser() user: TokenPayload,
  ): Promise<Chat> {
    return this.chatsService.create(createChatInput, user._id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ChatConnection, { name: 'chats' })
  async findAll(
    @Args() paginationArgs: ForwardPaginationArgs,
    @CurrentUser() user: TokenPayload,
  ): Promise<ChatConnection> {
    const { chats, hasNextPage } = await this.chatsService.findMany(
      [{ $match: this.chatsService.userChatFilter(user._id) }],
      paginationArgs,
    );

    const edges: ChatEdge[] = chats.map((chat) => ({
      cursor: encodeCursor(
        chat.latestMessage?.createdAt ?? chat.createdAt,
        chat._id.toString(),
      ),
      node: chat,
    }));

    const pageInfo: PageInfo = {
      hasNextPage,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    };

    return { edges, pageInfo };
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Chat, { name: 'chat' })
  findOne(
    @Args('_id') _id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<Chat> {
    return this.chatsService.findOne(_id, user._id);
  }

  @Mutation(() => Chat)
  updateChat(@Args('updateChatInput') updateChatInput: UpdateChatInput) {
    return this.chatsService.update(updateChatInput.id, updateChatInput);
  }

  @Mutation(() => Chat)
  removeChat(@Args('id', { type: () => Int }) id: number) {
    return this.chatsService.remove(id);
  }
}
