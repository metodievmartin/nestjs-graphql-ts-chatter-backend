import { Controller, Post, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';

import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /*
   * No @Body() needed here - LocalAuthGuard handles credential extraction.
   * By the time this handler runs, the guard has already:
   * 1. Extracted email/password from request body
   * 2. Validated credentials via LocalStrategy.validate()
   * 3. Attached the verified user to request.user
   * If validation fails, this handler never executes (guard returns 401).
   */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @CurrentUser() user: User, // Reads request.user set by Passport
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(user, response);
  }
}
