import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('Validating user:', email, 'Password provided:', !!password);
    const user = await this.userRepository.findOne({ where: { email } });
    console.log(
      'User found:',
      !!user,
      'Has password:',
      !!user?.password,
      'Is social:',
      user?.isSocial,
      'Is verified:',
      user?.isVerified,
    );

    // Check if user exists and has a password (not social login)
    if (user && user.password && !user.isSocial) {
      // Check if email is verified
      if (!user.isVerified) {
        throw new BadRequestException(
          'Please verify your email before logging in',
        );
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);
      if (isMatch) {
        const {
          password,
          verificationToken,
          verificationTokenExpires,
          resetPasswordToken,
          resetPasswordTokenExpires,
          ...result
        } = user;
        return result;
      }
    }
    return null;
  }

  async validateOAuthLogin(
    googleId: string | null,
    email: string,
  ): Promise<any> {
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
          isVerified: true, // Social users are automatically verified
          password: null,
        });
      } else {
        user.googleId = googleId;
        user.isSocial = true;
        user.isVerified = true; // Mark as verified when linking to Google
      }
      await this.userRepository.save(user);
    }
    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<any> {
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // 24 hours

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      displayName: displayName ?? undefined,
      verificationToken,
      verificationTokenExpires,
    });

    await this.userRepository.save(user);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails, but log it
    }

    const {
      password: _,
      verificationToken: __,
      verificationTokenExpires: ___,
      ...result
    } = user;
    return result;
  }

  async verifyEmail(token: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Check if token is expired
    if (
      user.verificationTokenExpires &&
      user.verificationTokenExpires < new Date()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await this.userRepository.save(user);

    const {
      password,
      verificationToken,
      verificationTokenExpires,
      resetPasswordToken,
      resetPasswordTokenExpires,
      ...result
    } = user;
    return result;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || user.isSocial) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token
    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordTokenExpires = new Date();
    resetPasswordTokenExpires.setHours(
      resetPasswordTokenExpires.getHours() + 1,
    ); // 1 hour

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordTokenExpires = resetPasswordTokenExpires;

    await this.userRepository.save(user);

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetPasswordToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    // Check if token is expired
    if (
      !user.resetPasswordTokenExpires ||
      user.resetPasswordTokenExpires < new Date()
    ) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;

    await this.userRepository.save(user);

    const {
      password,
      verificationToken,
      verificationTokenExpires,
      resetPasswordToken,
      resetPasswordTokenExpires,
      ...result
    } = user;
    return result;
  }
}
