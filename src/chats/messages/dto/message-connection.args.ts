import { ArgsType, Field } from '@nestjs/graphql';
import { IsMongoId, IsNotEmpty } from 'class-validator';

import { BackwardPaginationArgs } from '../../../common/dto/pagination-args.dto';

@ArgsType()
export class MessageConnectionArgs extends BackwardPaginationArgs {
  @Field()
  @IsNotEmpty()
  @IsMongoId({ message: 'chatId must be a valid ID' })
  chatId: string;
}
