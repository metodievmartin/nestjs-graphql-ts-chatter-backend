import { Module } from '@nestjs/common';

import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { MessagesRepository } from './messages.repository';
import { MessageSchema } from './entities/message.document';
import { UsersModule } from '../../users/users.module';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    UsersModule,
  ],
  providers: [MessagesResolver, MessagesService, MessagesRepository],
  exports: [MessagesRepository],
})
export class MessagesModule {}
