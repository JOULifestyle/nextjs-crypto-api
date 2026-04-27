import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpException,
  HttpStatus,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { ResponseMessage } from '../shared/response.utils';
import { UserWithoutSensitiveData, LoginResponse } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from './auth.dto';

// Interface for authenticated requests
interface AuthenticatedRequest {
  user: UserWithoutSensitiveData;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for registration
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const user = await this.authService.register(
      body.email,
      body.password,
      body.displayName,
    );
    return new ResponseMessage(true, { user }, 'User registered successfully');
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for login
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: AuthenticatedRequest) {
    const payload = await this.authService.login(req.user);
    return new ResponseMessage(true, payload, 'Login successful');
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Passport will handle the redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req: AuthenticatedRequest) {
    const payload = await this.authService.login(req.user);
    return new ResponseMessage(
      true,
      payload,
      'OAuth callback login successful',
    );
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(body.token);
    return new ResponseMessage(true, { user }, 'Email verified successfully');
  }

  @Get('verify-email')
  async verifyEmailGet(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const user = await this.authService.verifyEmail(token);
    // For GET requests, return a simple HTML response
    return `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #4CAF50;">Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Go to App
          </a>
        </body>
      </html>
    `;
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute for password reset
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.forgotPassword(body.email);
    return new ResponseMessage(
      true,
      null,
      'If an account with that email exists, a password reset link has been sent',
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute for resend verification
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(body.email);
    return new ResponseMessage(
      true,
      null,
      'Verification email has been resent',
    );
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    const user = await this.authService.resetPassword(body.token, body.newPassword);
    return new ResponseMessage(true, { user }, 'Password reset successfully');
  }
}
