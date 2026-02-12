import { ArgsType, Field } from '@nestjs/graphql';
import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

@ArgsType()
export class MessageCreatedArgs {
  @Field(() => [String])
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsMongoId({
    each: true,
    message: 'each value in chatIds must be a valid ID',
  })
  chatIds: string[];
}
