import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';

import { Chat } from './entities/chat.entity';
import { AbstractRepository } from '../common/database/abstract.repository';
import { ChatDocument } from './entities/chat.document';

@Injectable()
export class ChatsRepository extends AbstractRepository<ChatDocument> {
  protected logger = new Logger(ChatsRepository.name);

  constructor(@InjectModel(Chat.name) chatModel: Model<ChatDocument>) {
    super(chatModel);
  }
}
