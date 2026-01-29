import { Types } from 'mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

import { Message } from './entities/message.entity';
import { ChatsRepository } from '../chats.repository';
import { GetMessagesArgs } from './dto/get-messages.args';
import { CreateMessageInput } from './dto/create-message.input.file';
import { PUB_SUB } from '../../common/constants/injection-tokens';
import { MESSAGE_CREATED } from './constants/pubsub-triggers';
import { MessageCreatedArgs } from './dto/message-created.args';
import { ChatsService } from '../chats.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly chatsService: ChatsService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async createMessage({ content, chatId }: CreateMessageInput, userId: string) {
    const message: Message = {
      content,
      userId,
      chatId,
      createdAt: new Date(),
      _id: new Types.ObjectId(),
    };

    await this.chatsRepository.findOneAndUpdate(
      {
        _id: new Types.ObjectId(chatId),
        ...this.chatsService.userChatFilter(userId),
      },
      {
        $push: {
          messages: message,
        },
      },
    );

    await this.pubSub.publish(MESSAGE_CREATED, { messageCreated: message });

    return message;
  }

  async getMessages({ chatId }: GetMessagesArgs, userId: string) {
    return (
      await this.chatsRepository.findOne({
        _id: new Types.ObjectId(chatId),
        ...this.chatsService.userChatFilter(userId),
      })
    ).messages;
  }

  async messageCreated({ chatId }: MessageCreatedArgs, userId: string) {
    await this.chatsRepository.findOne({
      _id: new Types.ObjectId(chatId),
      ...this.chatsService.userChatFilter(userId),
    });
    return this.pubSub.asyncIterableIterator(MESSAGE_CREATED);
  }
}
