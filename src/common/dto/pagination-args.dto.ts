import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Max, Min } from 'class-validator';

const MAX_PAGE_SIZE = 100;

/**
 * Forward pagination args (Relay spec)
 * Use for lists where you load more by scrolling DOWN (e.g., chat list)
 * - first: number of items to fetch (1-100)
 * - after: cursor pointing to the last item of the previous page
 */
@ArgsType()
export class ForwardPaginationArgs {
  @Field(() => Int)
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  first: number;

  @Field({ nullable: true })
  after?: string;
}

/**
 * Backward pagination args (Relay spec)
 * Use for lists where you load more by scrolling UP (e.g., message history)
 * - last: number of items to fetch (1-100)
 * - before: cursor pointing to the first item of the current page
 */
@ArgsType()
export class BackwardPaginationArgs {
  @Field(() => Int)
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  last: number;

  @Field({ nullable: true })
  before?: string;
}
