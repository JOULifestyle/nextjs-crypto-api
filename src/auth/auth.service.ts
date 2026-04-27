import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Types for better type safety
export type UserWithoutSensitiveData = Omit<User, 'password' | 'verificationToken' | 'verificationTokenExpires' | 'resetPasswordToken' | 'resetPasswordTokenExpires'>;

export interface LoginResponse {
  access_token: string;
  user: UserWithoutSensitiveData;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutSensitiveData | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && user.password && !user.isSocial) {
      if (!user.isVerified) {
        throw new BadRequestException('Please verify your email before logging in');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const { password, verificationToken, verificationTokenExpires, resetPasswordToken, resetPasswordTokenExpires, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async validateOAuthLogin(googleId: string | null, email: string): Promise<UserWithoutSensitiveData> {
    let user = await this.userRepository.findOne({
      where: { googleId: googleId ?? undefined },
    });
    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });
      if (user && user.googleId && user.googleId !== googleId) {
        throw new ConflictException('Email linked to different Google account');
      }
      if (!user) {
        user = this.userRepository.create({
          email,
          googleId: googleId ?? undefined,
          isSocial: true,
          isVerified: true,
          password: null,
        });
      } else {
        user.googleId = googleId;
        user.isSocial = true;
        user.isVerified = true;
      }
      await this.userRepository.save(user);
    }
    const { password, ...result } = user;
    return result;
  }

  async login(user: UserWithoutSensitiveData): Promise<LoginResponse> {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(email: string, password: string, displayName?: string): Promise<UserWithoutSensitiveData> {
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      displayName: displayName ?? undefined,
      verificationToken,
      verificationTokenExpires,
    });

    await this.userRepository.save(user);

    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    const { password: _, verificationToken: __, verificationTokenExpires: ___, ...result } = user;
    return result;
  }

  async verifyEmail(token: string): Promise<UserWithoutSensitiveData> {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await this.userRepository.save(user);

    const { password, verificationToken, verificationTokenExpires, resetPasswordToken, resetPasswordTokenExpires, ...result } = user;
    return result;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return;
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.isSocial) {
      throw new BadRequestException('Social login users are already verified');
    }

    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;

    await this.userRepository.save(user);

    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || user.isSocial) {
      return;
    }

    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordTokenExpires = new Date();
    resetPasswordTokenExpires.setHours(resetPasswordTokenExpires.getHours() + 1);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordTokenExpires = resetPasswordTokenExpires;

    await this.userRepository.save(user);

    try {
      await this.emailService.sendPasswordResetEmail(email, resetPasswordToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<UserWithoutSensitiveData> {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    if (!user.resetPasswordTokenExpires || user.resetPasswordTokenExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;

    await this.userRepository.save(user);

    const { password, verificationToken, verificationTokenExpires, resetPasswordToken, resetPasswordTokenExpires, ...result } = user;
    return result;
  }
}
