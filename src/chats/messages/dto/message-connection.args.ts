import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import { BackwardPaginationArgs } from '../../../common/dto/pagination-args.dto';

@ArgsType()
export class MessageConnectionArgs extends BackwardPaginationArgs {
  @Field()
  @IsNotEmpty()
  chatId: string;
}