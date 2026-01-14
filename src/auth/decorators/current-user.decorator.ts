import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { User } from '../../users/entities/user.entity';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

/**
 * Extracts request.user which Passport populates after successful authentication.
 * Works with any Passport strategy (local, jwt, oauth, etc.) since they all
 * attach the validated user to the same request.user property.
 *
 * For GraphQL: use context.switchToHttp().getRequest() won't work directly.
 * Instead: GqlExecutionContext.create(context).getContext().req.user
 */
const getCurrentUserByContext = (context: ExecutionContext): User | null => {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest().user;
  }

  if (context.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext().req.user;
  }

  return null;
};

export const CurrentUser = createParamDecorator(
  // First param (_data) receives decorator arguments: @CurrentUser('email') → _data = 'email'
  // Useful if you want @CurrentUser('id') to return just user.id
  (_data: unknown, context: ExecutionContext) => {
    return getCurrentUserByContext(context);
  },
);
