import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { TokenBlocklistService } from './token-blocklist.service';
import type { JwtPayload } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlocklistService: TokenBlocklistService,
  ) {
    super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false as const,
  secretOrKey: configService.get<string>('JWT_SECRET') as string,
  passReqToCallback: true as const,
});
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<{ id: number; email: string }> {
    const token = req.headers['authorization']?.split(' ')[1];

    if (token && this.tokenBlocklistService.isBlocked(token)) {
      throw new UnauthorizedException('Token has been invalidated');
    }
    return { id: payload.sub, email: payload.email };
  }
}
