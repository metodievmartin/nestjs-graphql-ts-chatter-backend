import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';

import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { GetMessagesArgs } from './dto/get-messages.args';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CreateMessageInput } from './dto/create-message.input.file';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TokenPayload } from '../../auth/types/token-payload.interface';
import { MessageCreatedArgs } from './dto/message-created.args';

@Resolver()
export class MessagesResolver {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Message)
  async createMessage(
    @Args('createMessageInput') createMessageInput: CreateMessageInput,
    @CurrentUser() user: TokenPayload,
  ): Promise<Message> {
    return this.messagesService.createMessage(createMessageInput, user._id);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [Message], { name: 'messages' })
  async getMessages(
    @Args() getMessageArgs: GetMessagesArgs,
  ): Promise<Message[]> {
    return this.messagesService.getMessages(getMessageArgs);
  }

  @Subscription(() => Message, {
    filter: (payload, variables: MessageCreatedArgs, context) => {
      const userId = context.req.user._id;
      const message: Message = payload.messageCreated;
      return (
        message.chatId === variables.chatId &&
        userId !== message.user._id.toHexString()
      );
    },
  })
  messageCreated(@Args() messageCreatedArgs: MessageCreatedArgs) {
    return this.messagesService.messageCreated(messageCreatedArgs);
  }
}
