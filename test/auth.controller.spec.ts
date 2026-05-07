import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { TokenBlocklistService } from '../src/auth/token-blocklist.service';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../src/email/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RegisterDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from '../src/auth/auth.dto';
import type { UserWithoutSensitiveData, LoginResponse } from '../src/types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: UserWithoutSensitiveData = {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    isVerified: true,
    isSocial: false,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginResponse: LoginResponse = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: mockUser,
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      validateUser: jest.fn(),
      validateOAuthLogin: jest.fn(),
      verifyEmail: jest.fn(),
      resendVerificationEmail: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const mockTokenBlocklistService = {
      add: jest.fn(),
      isBlocked: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock-token') } },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TokenBlocklistService, useValue: mockTokenBlocklistService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      displayName: 'New User',
    };

    it('should register a new user successfully', async () => {
      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.displayName,
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
expect(result.data?.user).toEqual(mockUser);
      expect(result.message).toBe('User registered successfully');
    });

    it('should handle registration errors', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should handle login through LocalAuthGuard', () => {
      expect(controller.login).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const mockRequest = {
        user: mockUser,
        headers: { authorization: 'Bearer old-access-token' },
      };
      authService.refreshToken.mockResolvedValue(mockLoginResponse);

      const result = await controller.refresh(mockRequest as any);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
        'old-access-token',
      );
      expect(result.success).toBe(true);
    });

    it('should handle refresh token errors', async () => {
      const mockRequest = {
        user: mockUser,
        headers: { authorization: 'Bearer old-access-token' },
      };
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );
      await expect(controller.refresh(mockRequest as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('googleAuthRedirect', () => {
    it('should handle Google OAuth callback successfully', async () => {
      const mockRequest = {
        user: mockUser,
      };
      authService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.googleAuthRedirect(mockRequest as any);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result.success).toBe(true);
      expect(result.message).toBe('OAuth callback login successful');
      expect(result.data).toEqual(mockLoginResponse);
    });

    it('should handle Google OAuth login errors', async () => {
      const mockRequest = {
        user: mockUser,
      };
      authService.login.mockRejectedValue(new UnauthorizedException('OAuth failed'));

      await expect(controller.googleAuthRedirect(mockRequest as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail GET', () => {
    it('should verify email via GET request successfully', async () => {
      authService.verifyEmail.mockResolvedValue(mockUser);

      const result = await controller.verifyEmailGet('valid-token');

      expect(authService.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(result).toContain('Email Verified Successfully');
      expect(result).toContain('Go to App');
    });

    it('should throw BadRequestException when token is missing', async () => {
      await expect(controller.verifyEmailGet('')).rejects.toThrow(BadRequestException);
      await expect(controller.verifyEmailGet(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should handle verification errors in GET request', async () => {
      authService.verifyEmail.mockRejectedValue(new BadRequestException('Invalid token'));

      await expect(controller.verifyEmailGet('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    const mockRequest = {
      user: mockUser,
      headers: { authorization: 'Bearer access-token' },
    };

    it('should logout user successfully', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockRequest as any);

      expect(authService.logout).toHaveBeenCalledWith(mockUser.id, 'access-token');
      expect(result.success).toBe(true);
    });

    it('should handle logout errors', async () => {
      authService.logout.mockRejectedValue(
        new BadRequestException('Logout failed'),
      );
      await expect(controller.logout(mockRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyEmailDto: VerifyEmailDto = {
      token: 'valid-verification-token',
    };

    it('should verify email successfully', async () => {
      authService.verifyEmail.mockResolvedValue(mockUser);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto.token);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
expect(result.data?.user).toEqual(mockUser);
    });

    it('should handle invalid verification token', async () => {
      authService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid verification token'),
      );
      await expect(controller.verifyEmail(verifyEmailDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email successfully', async () => {
      authService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(result.success).toBe(true);
    });

    it('should handle forgot password errors', async () => {
      authService.forgotPassword.mockRejectedValue(
        new BadRequestException('User not found'),
      );
      await expect(
        controller.forgotPassword(forgotPasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    const resendVerificationDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    it('should resend verification email successfully', async () => {
      authService.resendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.resendVerification(resendVerificationDto);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
        resendVerificationDto.email,
      );
      expect(result.success).toBe(true);
    });

    it('should handle resend verification errors', async () => {
      authService.resendVerificationEmail.mockRejectedValue(
        new BadRequestException('Email already verified'),
      );
      await expect(
        controller.resendVerification(resendVerificationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-reset-token',
      newPassword: 'newpassword123',
    };

    it('should reset password successfully', async () => {
      authService.resetPassword.mockResolvedValue(mockUser);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      expect(result.success).toBe(true);
    });

    it('should handle invalid reset token', async () => {
      authService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid reset token'),
      );
      await expect(
        controller.resetPassword(resetPasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});