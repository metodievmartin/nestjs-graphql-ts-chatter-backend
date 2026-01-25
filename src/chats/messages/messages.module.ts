import { forwardRef, Module } from '@nestjs/common';

import { ChatsModule } from '../chats.module';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';

@Module({
  imports: [forwardRef(() => ChatsModule)],
  providers: [MessagesResolver, MessagesService],
})
export class MessagesModule {}
