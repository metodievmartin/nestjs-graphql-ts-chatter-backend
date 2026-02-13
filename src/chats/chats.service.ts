import { PipelineStage, Types } from 'mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ChatsRepository } from './chats.repository';
import { CreateChatInput } from './dto/create-chat.input';
import { UpdateChatInput } from './dto/update-chat.input';
import { ForwardPaginationArgs } from '../common/dto/pagination-args.dto';
import { Chat } from './entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { UserDocument } from '../users/entities/user.document';
import { MessageDocument } from './messages/entities/message.document';
import { decodeCursor } from '../common/utils/cursor.util';
import { UsersService } from '../users/users.service';

// Represents aggregation output during transformation (allows mutation from raw to final shape)
interface LatestMessageAggregation extends Omit<
  MessageDocument,
  'userId' | 'chatId'
> {
  user: UserDocument | User; // UserDocument from $lookup, becomes User after transform
  userId?: Types.ObjectId;
  chatId?: string;
  createdAt: Date;
}

interface ChatAggregation {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  sortDate: Date;
  latestMessage?: LatestMessageAggregation;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly userService: UsersService,
  ) {}

  async create(
    createChatInput: CreateChatInput,
    userId: string,
  ): Promise<Chat> {
    const userIds = createChatInput.userIds ?? [];
    if (!userIds.includes(userId)) {
      userIds.push(userId);
    }

    const chatDocument = await this.chatsRepository.create({
      ...createChatInput,
      userId,
      userIds,
      isPrivate: createChatInput.isPrivate ?? false,
    });
    return chatDocument as unknown as Chat;
  }

  async findMany(
    prePipelineStages: PipelineStage[] = [],
    paginationArgs: ForwardPaginationArgs,
  ): Promise<{ chats: Chat[]; hasNextPage: boolean }> {
    const { first, after } = paginationArgs;

    // Build cursor filter if cursor provided
    const cursorMatch: PipelineStage[] = [];
    if (after) {
      const { d: sortDate, i: id } = decodeCursor(after);
      cursorMatch.push({
        $match: {
          $or: [
            { sortDate: { $lt: new Date(sortDate) } },
            {
              sortDate: new Date(sortDate),
              _id: { $lt: new Types.ObjectId(id) },
            },
          ],
        },
      });
    }

    // Pipeline overview:
    // Starting shape (from chats collection): { _id, userId, name, createdAt, updatedAt }
    //
    // 1. prePipelineStages — caller-injected filters (e.g. $match for access control)
    // 2. $lookup messages  — joins each chat with its newest message from the messages collection
    //                         uses a sub-pipeline so we can sort + limit INSIDE the join
    // 3. $unwind           — converts latestMessage from a 1-element array to a plain object
    // 4. $addFields        — computes sortDate for ordering (latest activity or chat creation)
    // 5. cursorMatch       — cursor-based pagination filter (skip already-seen chats)
    // 6. $sort + $limit    — final ordering and page size
    const chats = await this.chatsRepository.model.aggregate<ChatAggregation>([
      ...prePipelineStages,

      // For each chat, find its most recent message and attach the message's author.
      // `let` captures the chat's _id as $$chatId for use inside the sub-pipeline.
      // The sub-pipeline runs against the `messages` collection and returns 0 or 1 documents.
      // Result: latestMessage becomes a 0-or-1-element array on each chat document.
      //
      // Shape after: { ..., latestMessage: [{ _id, content, createdAt, user: { ... } }] }
      //          or: { ..., latestMessage: [] }  (for chats with no messages)
      {
        $lookup: {
          from: 'messages',
          let: { chatId: '$_id' },
          pipeline: [
            // $expr is required to reference the $$chatId variable from `let`
            // (a regular { chatId: '$$chatId' } filter wouldn't resolve the variable)
            { $match: { $expr: { $eq: ['$chatId', '$$chatId'] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 1 },
            // Nested $lookup: resolve the message author from the users collection
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user', // always returns an array
              },
            },
            // $unwind converts user from [UserDocument] to UserDocument
            // preserveNullAndEmptyArrays: keeps the message even if the user was deleted
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $unset: 'userId' },
          ],
          as: 'latestMessage',
        },
      },

      // $lookup always returns an array. Since we $limit: 1 inside the sub-pipeline,
      // latestMessage is either [message] or []. $unwind converts it to a plain object
      // or removes the field entirely (preserveNullAndEmptyArrays keeps the chat document
      // in the pipeline even when there are no messages — latestMessage becomes null).
      //
      // Shape after: { ..., latestMessage: { _id, content, createdAt, user } } or { ..., latestMessage: null }
      {
        $unwind: {
          path: '$latestMessage',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Chats are sorted by most recent activity. If a chat has messages, use the latest
      // message's timestamp; otherwise fall back to the chat's own createdAt.
      // $ifNull returns the first non-null value from the array.
      //
      // Shape after: { ..., sortDate: Date }
      {
        $addFields: {
          sortDate: {
            $ifNull: ['$latestMessage.createdAt', '$createdAt'],
          },
        },
      },

      // Cursor-based pagination: skip chats the client has already seen.
      // Uses compound (sortDate, _id) comparison to handle ties deterministically.
      ...cursorMatch,

      { $sort: { sortDate: -1, _id: -1 } },

      // Request one extra document beyond the page size to detect hasNextPage
      { $limit: first + 1 },
    ]);

    // Determine hasNextPage
    const hasNextPage = chats.length > first;
    const resultChats = hasNextPage ? chats.slice(0, first) : chats;

    // Post-process: transform raw aggregation output into the GraphQL Chat shape.
    // - If latestMessage is null/empty (chat has no messages), delete it so it resolves as null in GQL
    // - Convert the raw UserDocument into a User entity (strips Mongoose internals, maps _id → string)
    // - Set chatId on the message (the aggregation works with ObjectIds, but GQL expects a string)
    resultChats.forEach((chat) => {
      if (!chat.latestMessage?._id) {
        delete chat.latestMessage;
        return;
      }
      chat.latestMessage.user = this.userService.toEntity(
        chat.latestMessage.user as UserDocument,
      );
      chat.latestMessage.chatId = chat._id.toHexString();
    });

    return { chats: resultChats as unknown as Chat[], hasNextPage };
  }

  async findOne(_id: string, userId: string) {
    const { chats } = await this.findMany(
      [
        { $match: { _id: new Types.ObjectId(_id) } },
        { $match: this.userChatFilter(userId) },
      ],
      { first: 1 },
    );

    if (!chats[0]) {
      throw new NotFoundException(`No chat was found with ID ${_id}`);
    }

    return chats[0];
  }

  async verifyAccessToChatsList(
    chatIds: string[],
    userId: string,
  ): Promise<void> {
    const objectIds = chatIds.map((id) => new Types.ObjectId(id));
    const count = await this.chatsRepository.model.countDocuments({
      _id: { $in: objectIds },
      ...this.userChatFilter(userId),
    });

    if (count < chatIds.length) {
      throw new NotFoundException(
        'One or more of the specified chats were not found',
      );
    }
  }

  async verifyAccessToSingleChat(
    chatId: string,
    userId: string,
  ): Promise<void> {
    const count = await this.chatsRepository.model.countDocuments({
      _id: new Types.ObjectId(chatId),
      ...this.userChatFilter(userId),
    });

    if (count === 0) {
      throw new NotFoundException(`No chat was found with ID ${chatId}`);
    }
  }

  update(id: number, updateChatInput: UpdateChatInput) {
    return `This action updates a #${id} chat`;
  }

  remove(id: number) {
    return `This action removes a #${id} chat`;
  }

  userChatFilter(userId: string) {
    return {
      $or: [
        { userId },
        {
          userIds: {
            $in: [userId],
          },
        },
        { isPrivate: false },
      ],
    };
  }
}
