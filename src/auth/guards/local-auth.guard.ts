import { AuthGuard } from '@nestjs/passport';

/**
 * AuthGuard('local') creates a guard that triggers passport.authenticate('local').
 * The 'local' string must match the strategy name (passport-local's default).
 *
 * Under the hood, canActivate():
 * 1. Extracts credentials from request using the strategy's configured fields
 * 2. Calls LocalStrategy.validate() with those credentials
 * 3. On success: attaches returned user to request.user, returns true
 * 4. On failure: throws UnauthorizedException (401)
 *
 * Extend this class to override handleRequest() for custom error handling,
 * or to add logic in canActivate() before/after super.canActivate().
 */
export class LocalAuthGuard extends AuthGuard('local') {}
