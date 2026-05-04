import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { RefreshTokenGuard } from './refresh-token.guard';
import { ResponseMessage } from '../shared/response.utils';
import type { UserWithoutSensitiveData } from '../types';
import {
  RegisterDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from '../types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for registration
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Email not verified' })
  async login(@Request() req: AuthenticatedRequest) {
    const payload = await this.authService.login(req.user);
    return new ResponseMessage(true, payload, 'Login successful');
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for token refresh
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Request() req: AuthenticatedRequest) {
    const oldAccessToken = req.headers['authorization']?.split(' ')[1];
    const payload = await this.authService.refreshToken(
      req.user.id,
      req.user.email,
      oldAccessToken,
    );
    return new ResponseMessage(true, payload, 'Token refreshed successfully');
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description:
      'Redirects to Google OAuth. Must be tested in a browser, not Swagger UI.',
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirect to Google OAuth. Must be tested in a browser, not Swagger UI.',
  })
  async googleAuth() {
    // Passport will handle the redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth login successful' })
  async googleAuthRedirect(@Request() req: AuthenticatedRequest) {
    const payload = await this.authService.login(req.user);
    return new ResponseMessage(
      true,
      payload,
      'OAuth callback login successful',
    );
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(body.token);
    return new ResponseMessage(true, { user }, 'Email verified successfully');
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email via link (GET request)' })
  @ApiResponse({ status: 200, description: 'Email verification page' })
  @ApiResponse({ status: 400, description: 'Token required' })
  async verifyEmailGet(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    await this.authService.verifyEmail(token);
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
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
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
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email resent' })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or social login',
  })
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(body.email);
    return new ResponseMessage(
      true,
      null,
      'Verification email has been resent',
    );
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const user = await this.authService.resetPassword(
      body.token,
      body.newPassword,
    );
    return new ResponseMessage(true, { user }, 'Password reset successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user and invalidate tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req: AuthenticatedRequest) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      throw new BadRequestException('No token provided');
    }
    await this.authService.logout(req.user.id, token);
    return new ResponseMessage(true, null, 'Logged out successfully');
  }
}
