import { forwardRef, Module } from '@nestjs/common';

import { Chat } from './entities/chat.entity';
import { ChatsService } from './chats.service';
import { ChatsResolver } from './chats.resolver';
import { ChatsRepository } from './chats.repository';
import { ChatSchema } from './entities/chat.document';
import { MessagesModule } from './messages/messages.module';
import { DatabaseModule } from '../common/database/database.module';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    forwardRef(() => MessagesModule),
  ],
  providers: [ChatsResolver, ChatsService, ChatsRepository],
  exports: [ChatsRepository],
})
export class ChatsModule {}
