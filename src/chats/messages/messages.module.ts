import { forwardRef, Module } from '@nestjs/common';

import { ChatsModule } from '../chats.module';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [forwardRef(() => ChatsModule), UsersModule],
  providers: [MessagesResolver, MessagesService],
})
export class MessagesModule {}
