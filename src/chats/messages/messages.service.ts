import { PipelineStage, Types } from 'mongoose';
import { Inject, Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

import { Message } from './entities/message.entity';
import { ChatsRepository } from '../chats.repository';
import { CreateMessageInput } from './dto/create-message.input.file';
import { PUB_SUB } from '../../common/constants/injection-tokens';
import { MESSAGE_CREATED } from './constants/pubsub-triggers';
import { MessageDocument } from './entities/message.document';
import { UserDocument } from '../../users/entities/user.document';
import { UsersService } from '../../users/users.service';

// Shape returned by aggregation after $lookup/$unwind/$unset/$set
interface MessageAggregation extends Omit<MessageDocument, 'userId'> {
  user: UserDocument;
  chatId: string;
}
import {
  MessageConnection,
  MessageEdge,
  MessagePageInfo,
} from './dto/message-connection.dto';
import { MessageConnectionArgs } from './dto/message-connection.args';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor.util';

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

  async getMessages({
    chatId,
    last,
    before,
  }: MessageConnectionArgs): Promise<MessageConnection> {
    // Build the aggregation pipeline
    const pipeline: PipelineStage[] = [
      // Find the specific chat
      { $match: { _id: new Types.ObjectId(chatId) } },
      // Deconstruct messages array into separate documents (one per message)
      { $unwind: '$messages' },
      // Promote message fields to root level (discard chat wrapper)
      { $replaceRoot: { newRoot: '$messages' } },
      // Sort by createdAt descending (newest first for slicing)
      { $sort: { createdAt: -1, _id: -1 } },
    ];

    // Apply cursor filter if provided (get messages OLDER than cursor)
    if (before) {
      const { d: cursorDate, i: cursorId } = decodeCursor(before);
      pipeline.push({
        $match: {
          $or: [
            { createdAt: { $lt: new Date(cursorDate) } },
            {
              createdAt: new Date(cursorDate),
              _id: { $lt: new Types.ObjectId(cursorId) },
            },
          ],
        },
      });
    }

    // Fetch one extra to determine hasPreviousPage
    pipeline.push({ $limit: last + 1 });

    // Join with users collection to get full user object
    pipeline.push(
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
    );

    const messages =
      await this.chatsRepository.model.aggregate<MessageAggregation>(pipeline);

    // Determine hasPreviousPage (are there older messages?)
    const hasPreviousPage = messages.length > last;
    const resultMessages = hasPreviousPage ? messages.slice(0, last) : messages;

    // Reverse to get chronological order (oldest first for display)
    resultMessages.reverse();

    // Build edges with cursors
    const edges: MessageEdge[] = resultMessages.map((message) => {
      const node: Message = {
        ...message,
        user: this.usersService.toEntity(message.user),
      };

      return {
        cursor: encodeCursor(message.createdAt, message._id.toHexString()),
        node,
      };
    });

    // Build pageInfo
    const pageInfo: MessagePageInfo = {
      hasPreviousPage,
      hasNextPage: false, // For backward pagination, new messages come via subscription
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    };

    return { edges, pageInfo };
  }

  messageCreated() {
    return this.pubSub.asyncIterableIterator(MESSAGE_CREATED);
  }
}
