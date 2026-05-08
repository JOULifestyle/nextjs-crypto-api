import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../user/user.entity';
import type { JwtPayload } from '../types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh',
) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false as const,
      secretOrKey: (configService.get<string>('JWT_REFRESH_SECRET') ||
        configService.get<string>('JWT_SECRET')) as string,
      passReqToCallback: true as const,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<{ id: number; email: string }> {
    const { sub: userId, email } = payload;

    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, email },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshToken !== token) {
      throw new UnauthorizedException('Refresh token has been rotated');
    }

    if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return { id: userId, email };
  }
}
