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
interface LatestMessageAggregation extends Omit<MessageDocument, 'userId'> {
  user: UserDocument[] | User; // Array from $lookup, becomes single User after transform
  userId?: Types.ObjectId; // Deleted during transform
  chatId?: string; // Added during transform
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
    const chatDocument = await this.chatsRepository.create({
      ...createChatInput,
      userId,
      messages: [],
    });
    // Mongoose autopopulates createdAt with timestamps: true
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
      // Fetch items OLDER than cursor (sortDate, _id)
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

    const chats = await this.chatsRepository.model.aggregate<ChatAggregation>([
      // Allow callers to inject stages (e.g., $match) before the main pipeline
      ...prePipelineStages,

      // Compute sortDate: use latestMessage.createdAt or fall back to chat's createdAt
      {
        $addFields: {
          sortDate: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$messages', []] } }, 0] },
              then: { $arrayElemAt: ['$messages.createdAt', -1] },
              else: '$createdAt', // Use chat.createdAt, NOT new Date()
            },
          },
        },
      },

      // Apply cursor filter (items older than cursor)
      ...cursorMatch,

      // Sort by sortDate desc, then _id desc (for tiebreaker)
      { $sort: { sortDate: -1, _id: -1 } },

      // Fetch one extra to determine hasNextPage
      { $limit: first + 1 },

      // Extract latestMessage for response
      {
        $addFields: {
          latestMessage: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$messages', []] } }, 0] },
              then: { $arrayElemAt: ['$messages', -1] },
              else: null,
            },
          },
        },
      },

      // Remove full messages array from output (we only need latestMessage)
      { $unset: 'messages' },

      // Join with users collection to get user info for latestMessage
      {
        $lookup: {
          from: 'users',
          localField: 'latestMessage.userId',
          foreignField: '_id',
          as: 'latestMessage.user', // $lookup always returns an array
        },
      },
    ]);

    // Determine hasNextPage
    const hasNextPage = chats.length > first;
    const resultChats = hasNextPage ? chats.slice(0, first) : chats;

    // Post-process to match Chat shape
    resultChats.forEach((chat) => {
      if (!chat.latestMessage?._id) {
        delete chat.latestMessage;
        return;
      }
      // Unwrap user from array and transform to Message shape
      chat.latestMessage.user = this.userService.toEntity(
        (chat.latestMessage.user as UserDocument[])[0],
      );
      delete chat.latestMessage.userId;
      chat.latestMessage.chatId = chat._id.toHexString();
    });

    return { chats: resultChats as unknown as Chat[], hasNextPage };
  }

  async findOne(_id: string) {
    const { chats } = await this.findMany(
      [{ $match: { _id: new Types.ObjectId(_id) } }],
      { first: 1 },
    );

    if (!chats[0]) {
      throw new NotFoundException(`No chat was found with ID ${_id}`);
    }

    return chats[0];
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
