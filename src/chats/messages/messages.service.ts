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
import { MessageDocument } from './entities/message.document';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly usersService: UsersService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async createMessage({ content, chatId }: CreateMessageInput, userId: string) {
    const messageDocument: MessageDocument = {
      content,
      userId: new Types.ObjectId(userId),
      createdAt: new Date(),
      _id: new Types.ObjectId(),
    };

    await this.chatsRepository.findOneAndUpdate(
      {
        _id: new Types.ObjectId(chatId),
      },
      {
        $push: {
          messages: messageDocument,
        },
      },
    );

    const message: Message = {
      ...messageDocument,
      chatId,
      user: await this.usersService.findOne(userId),
    };

    await this.pubSub.publish(MESSAGE_CREATED, {
      messageCreated: message,
    });

    return message;
  }

  async getMessages({ chatId }: GetMessagesArgs): Promise<Message[]> {
    return this.chatsRepository.model.aggregate<Message>([
      // Find the specific chat
      { $match: { _id: new Types.ObjectId(chatId) } },
      // Deconstruct messages array into separate documents (one per message)
      { $unwind: '$messages' },
      // Promote message fields to root level (discard chat wrapper)
      { $replaceRoot: { newRoot: '$messages' } },
      // Join with users collection to get full user object
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user', // Result is always an array
        },
      },
      // Unwrap user from single-element array to object
      { $unwind: '$user' },
      // Remove userId (replaced by user object above)
      { $unset: 'userId' },
      // Add chatId to each message for GraphQL response
      { $set: { chatId } },
    ]);
  }

  messageCreated() {
    return this.pubSub.asyncIterableIterator(MESSAGE_CREATED);
  }
}
