import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';

import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { CreateMessageInput } from './dto/create-message.input.file';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { TokenPayload } from '../../auth/types/token-payload.interface';
import { MessageCreatedArgs } from './dto/message-created.args';
import { MessageConnection } from './dto/message-connection.dto';
import { MessageConnectionArgs } from './dto/message-connection.args';

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
  @Query(() => MessageConnection, { name: 'messages' })
  async getMessages(
    @Args() connectionArgs: MessageConnectionArgs,
    @CurrentUser() user: TokenPayload,
  ): Promise<MessageConnection> {
    return this.messagesService.getMessages(connectionArgs, user._id);
  }

  @Subscription(() => Message, {
    filter: (payload, variables: MessageCreatedArgs, context) => {
      const userId = context.req.user._id;
      const message: Message = payload.messageCreated;
      return (
        variables.chatIds.includes(message.chatId) &&
        userId !== message.user._id.toHexString()
      );
    },
  })
  messageCreated(@Args() _messageCreatedArgs: MessageCreatedArgs) {
    return this.messagesService.messageCreated();
  }
}
