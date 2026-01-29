import type { Request } from 'express';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { GRAPHQL_PATH } from '../constants';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  constructor(private readonly authService: AuthService) {}

  createGqlOptions(): ApolloDriverConfig {
    return {
      autoSchemaFile: true,
      path: GRAPHQL_PATH,
      subscriptions: {
        'graphql-ws': {
          path: GRAPHQL_PATH,
          onConnect: (context: any) => {
            try {
              // const request: Request = context.extra.request;
              // const user = authService.verifyWs(request);
              // context.extra.user = user;
              const request: Request = context.extra.request;
              const user = this.authService.verifyWs(request);
              context.user = user;
            } catch (e) {
              new Logger().error(e);
              throw new UnauthorizedException();
            }
          },
        },
      },
    };
  }
}
