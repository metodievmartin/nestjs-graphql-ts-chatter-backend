import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { MAX_CHAT_NAME_LENGTH, MIN_CHAT_NAME_LENGTH } from '../chats.constants';

@InputType()
export class CreateChatInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_CHAT_NAME_LENGTH)
  @MaxLength(MAX_CHAT_NAME_LENGTH)
  name: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({
    each: true,
    message: 'each value in userIds must be a valid ID',
  })
  userIds?: string[];
}
