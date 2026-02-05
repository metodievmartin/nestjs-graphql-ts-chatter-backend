import { PipelineStage, Types } from 'mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ChatsRepository } from './chats.repository';
import { CreateChatInput } from './dto/create-chat.input';
import { UpdateChatInput } from './dto/update-chat.input';
import { Chat } from './entities/chat.entity';
import { User } from '../users/entities/user.entity';
import { MessageDocument } from './messages/entities/message.document';

// Represents aggregation output during transformation (allows mutation from raw to final shape)
interface LatestMessageAggregation extends Omit<MessageDocument, 'userId'> {
  user: User[] | User; // Array from $lookup, becomes single User after transform
  userId?: Types.ObjectId; // Deleted during transform
  chatId?: string; // Added during transform
}

interface ChatAggregation {
  _id: Types.ObjectId;
  name: string;
  latestMessage?: LatestMessageAggregation;
}

@Injectable()
export class ChatsService {
  constructor(private readonly chatsRepository: ChatsRepository) {}

  async create(createChatInput: CreateChatInput, userId: string) {
    return this.chatsRepository.create({
      ...createChatInput,
      userId,
      messages: [],
    });
  }

  async findMany(prePipelineStages: PipelineStage[] = []): Promise<Chat[]> {
    const chats = await this.chatsRepository.model.aggregate<ChatAggregation>([
      // Allow callers to inject stages (e.g., $match) before the main pipeline
      ...prePipelineStages,
      // Extract last message from array (-1 = last element)
      { $set: { latestMessage: { $arrayElemAt: ['$messages', -1] } } },
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

    // Post-process to match Chat shape
    chats.forEach((chat) => {
      if (!chat.latestMessage?._id) {
        delete chat.latestMessage;
        return;
      }
      // Unwrap user from array and transform to Message shape
      chat.latestMessage.user = (chat.latestMessage.user as User[])[0];
      delete chat.latestMessage.userId;
      chat.latestMessage.chatId = chat._id.toHexString();
    });

    return chats as unknown as Chat[];
  }

  async findOne(_id: string) {
    const chats = await this.findMany([
      { $match: { _id: new Types.ObjectId(_id) } },
    ]);

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
