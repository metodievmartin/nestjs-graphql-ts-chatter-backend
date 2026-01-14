import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { UsersService } from '../../users/users.service';

/**
 * PassportStrategy(Strategy) wraps passport-local for NestJS DI.
 * The strategy auto-registers with name 'local' (from passport-local package).
 * To use a custom name: PassportStrategy(Strategy, 'custom-name')
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    // Options passed to passport-local's Strategy constructor.
    // By default it looks for 'username' and 'password' fields in request body.
    super({
      usernameField: 'email', // Override to use 'email' instead of 'username'
      // passwordField: 'password' ← default, can override if needed
    });
  }

  /**
   * Called automatically by Passport after extracting credentials from request body.
   * Params match the fields configured above (email from usernameField, password is default).
   * IMPORTANT: Return value gets attached to request.user by Passport.
   * If you throw, Passport returns 401 and stops the request.
   */
  async validate(email: string, password: string) {
    try {
      return await this.usersService.verifyUser(email, password);
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
