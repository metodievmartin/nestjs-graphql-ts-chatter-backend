import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';

import { Message } from './entities/message.entity';
import { MessageDocument } from './entities/message.document';
import { AbstractRepository } from '../../common/database/abstract.repository';

@Injectable()
export class MessagesRepository extends AbstractRepository<MessageDocument> {
  protected logger = new Logger(MessagesRepository.name);

  constructor(@InjectModel(Message.name) messageModel: Model<MessageDocument>) {
    super(messageModel);
  }
}
