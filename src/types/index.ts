import { Request } from 'express';
import { User } from '../user/user.entity';

export type UserWithoutSensitiveData = Omit<
  User,
  | 'password'
  | 'verificationToken'
  | 'verificationTokenExpires'
  | 'resetPasswordToken'
  | 'resetPasswordTokenExpires'
  | 'refreshToken'
  | 'refreshTokenExpires'
>;

export interface AuthenticatedRequest extends Request {
  user: UserWithoutSensitiveData;
}

export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string }>;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserWithoutSensitiveData;
}

export interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
}