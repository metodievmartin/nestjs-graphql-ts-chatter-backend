import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_CHAT_NAME_LENGTH, MIN_CHAT_NAME_LENGTH } from '../chats.constants';

@InputType()
export class CreateChatInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_CHAT_NAME_LENGTH)
  @MaxLength(MAX_CHAT_NAME_LENGTH)
  name: string;
}
