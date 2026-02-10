import { Module } from '@nestjs/common';

import { Chat } from './entities/chat.entity';
import { ChatsService } from './chats.service';
import { ChatsResolver } from './chats.resolver';
import { ChatsRepository } from './chats.repository';
import { ChatSchema } from './entities/chat.document';
import { MessagesModule } from './messages/messages.module';
import { DatabaseModule } from '../common/database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    MessagesModule,
    UsersModule,
  ],
  providers: [ChatsResolver, ChatsService, ChatsRepository],
})
export class ChatsModule {}
