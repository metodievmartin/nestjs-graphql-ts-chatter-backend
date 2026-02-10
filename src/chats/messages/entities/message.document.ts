import { Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { AbstractEntity } from '../../../common/database/abstract.entity';

@Schema({ timestamps: true })
export class MessageDocument extends AbstractEntity {
  @Prop()
  content: string;

  @Prop()
  chatId: Types.ObjectId;

  @Prop()
  userId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(MessageDocument);

// Index for cursor-based pagination
MessageSchema.index({ chatId: 1, createdAt: -1, _id: -1 });
