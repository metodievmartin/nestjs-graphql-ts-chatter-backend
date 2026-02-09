import { type Response } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';

import { User } from '../users/entities/user.entity';
import { TokenPayload } from './types/token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: User, response: Response) {
    const expires = new Date();

    expires.setSeconds(
      expires.getSeconds() + this.configService.getOrThrow('JWT_EXPIRATION'),
    );

    const tokenPayload: TokenPayload = {
      ...user,
      _id: user._id.toHexString(),
    };

    const token = this.jwtService.sign(tokenPayload);

    response.cookie('Authentication', token, {
      httpOnly: true,
      expires,
    });

    return token;
  }

  verifyWs(request: Request): TokenPayload {
    const cookies: string[] = request.headers?.cookie?.split('; ') || [];
    const authCookie = cookies.find((cookie) => {
      return cookie.includes('Authentication');
    });
    const jwt = authCookie?.split('Authentication=')[1] || '';

    return this.jwtService.verify(jwt);
  }

  logout(response: Response) {
    response.cookie('Authentication', '', {
      httpOnly: true,
      expires: new Date(),
    });
  }
}
