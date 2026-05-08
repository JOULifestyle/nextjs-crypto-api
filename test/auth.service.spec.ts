import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../src/email/email.service';
import { TokenBlocklistService } from '../src/auth/token-blocklist.service';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { UserWithoutSensitiveData } from '../src/types';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const setupAuthServiceTest = async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'refresh-secret';

  // Mock console.error to prevent test output noise and assert error logging
  jest.spyOn(console, 'error').mockImplementation(() => {});

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
    options: {} as any,
    logger: {} as any,
    mergeJwtOptions: jest.fn(),
    overrideSecretFromOptions: jest.fn(),
    getSecretKey: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockTokenBlocklistService = {
    add: jest.fn(),
    isBlocked: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    providers: [
      AuthService,
      { provide: getRepositoryToken(User), useValue: mockUserRepository },
      { provide: JwtService, useValue: mockJwtService },
      { provide: EmailService, useValue: mockEmailService },
      { provide: TokenBlocklistService, useValue: mockTokenBlocklistService },
    ],
  }).compile();

  const service = module.get<AuthService>(AuthService);
  const userRepository = module.get(getRepositoryToken(User));
  const jwtService = module.get(JwtService);
  const emailService = module.get(EmailService);
  const tokenBlocklistService = module.get(TokenBlocklistService);

  return {
    service,
    userRepository,
    jwtService,
    emailService,
    tokenBlocklistService,
  };
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<any>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;
  let tokenBlocklistService: jest.Mocked<TokenBlocklistService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
    displayName: 'Test User',
    isVerified: true,
    isSocial: false,
    verificationToken: null,
    verificationTokenExpires: null,
    resetPasswordToken: null,
    resetPasswordTokenExpires: null,
    refreshToken: null,
    refreshTokenExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    googleId: null,
  };

  const mockUserWithoutSensitive: UserWithoutSensitiveData = {
    id: 1,
    email: 'test@example.com',
    googleId: null,
    displayName: 'Test User',
    isVerified: true,
    isSocial: false,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const setup = await setupAuthServiceTest();
    service = setup.service;
    userRepository = setup.userRepository;
    jwtService = setup.jwtService as jest.Mocked<JwtService>;
    emailService = setup.emailService as jest.Mocked<EmailService>;
    tokenBlocklistService =
      setup.tokenBlocklistService as jest.Mocked<TokenBlocklistService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Dummy test to satisfy Jest's requirement for beforeEach
  it('should initialize AuthService', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid and user is verified', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        googleId: null,
        displayName: mockUser.displayName,
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        mockUser.email,
        'wrongpassword',
      );

      expect(result).toBeNull();
    });

    it('should return null when user is social login', async () => {
      const socialUser = { ...mockUser, isSocial: true, password: null };
      userRepository.findOne.mockResolvedValue(socialUser);

      const result = await service.validateUser(mockUser.email, 'password123');

      expect(result).toBeNull();
    });

    it('should return null for empty password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(mockUser.email, '');

      expect(result).toBeNull();
    });

    it('should return null for invalid email format', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('invalid-email', 'password123');

      expect(result).toBeNull();
    });

    it('should throw BadRequestException when user is not verified', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      userRepository.findOne.mockResolvedValue(unverifiedUser);

      await expect(
        service.validateUser(mockUser.email, 'password123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('register', () => {
    it('should register a new user successfully and send verification email', async () => {
      const newUserData = {
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      };
      const createdUser = {
        ...mockUser,
        ...newUserData,
        password: 'hashed-password',
        isVerified: false,
        verificationToken: 'mock-token',
        verificationTokenExpires: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(createdUser);
      userRepository.save.mockResolvedValue(createdUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(
        newUserData.email,
        newUserData.password,
        newUserData.displayName,
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: newUserData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(newUserData.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: newUserData.email,
        password: 'hashed-password',
        displayName: newUserData.displayName,
        verificationToken: expect.any(String),
        verificationTokenExpires: expect.any(Date),
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUserData.email,
        expect.any(String),
      );
      expect(result).toMatchObject({
        id: createdUser.id,
        email: createdUser.email,
        displayName: createdUser.displayName,
        googleId: null,
        isVerified: false,
        isSocial: false,
      });
    });

    it('should register user without displayName', async () => {
      const userWithoutDisplayName = { ...mockUser, displayName: null };
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(userWithoutDisplayName);
      userRepository.save.mockResolvedValue(userWithoutDisplayName);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register('new@example.com', 'password123');

      expect(result.displayName).toBeNull();
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register(mockUser.email, 'password123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should complete registration successfully even when email sending fails (non-blocking design)', async () => {
      const newUserEmail = 'new@example.com';
      const mockCreatedUser = { ...mockUser, email: newUserEmail };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockCreatedUser);
      userRepository.save.mockResolvedValue(mockCreatedUser);
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register(newUserEmail, 'password123');

      // Assert user is created successfully despite email failure
      expect(result).toMatchObject({
        id: mockUser.id,
        email: newUserEmail,
      });

      // Assert error is logged for monitoring/debugging
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send verification email:',
        expect.any(Error),
      );

      // Assert email service was attempted with correct email
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUserEmail,
        expect.any(String), // verification token
      );
    });

    it('should handle email delivery failures gracefully with retry indication', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Simulate different types of email failures
      const emailErrors = [
        new Error('SMTP server timeout'),
        new Error('Invalid recipient address'),
        new Error('Rate limit exceeded'),
      ];

      for (const emailError of emailErrors) {
        emailService.sendVerificationEmail.mockRejectedValueOnce(emailError);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

        const result = await service.register(
          `test${emailErrors.indexOf(emailError)}@example.com`,
          'password123',
        );

        // User should still be created successfully
        expect(result).toMatchObject({ id: mockUser.id });

        // Error should be logged
        expect(console.error).toHaveBeenCalledWith(
          'Failed to send verification email:',
          emailError,
        );
      }
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      userRepository.update.mockResolvedValue(undefined);

      const result = await service.login(mockUserWithoutSensitive);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(userRepository.update).toHaveBeenCalled();
      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      userRepository.update.mockResolvedValue(undefined);

      await expect(service.logout(1, 'access-token')).resolves.toBeUndefined();

      expect(tokenBlocklistService.add).toHaveBeenCalledWith('access-token');
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        refreshToken: null,
        refreshTokenExpires: null,
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      userRepository.update.mockResolvedValue(undefined);

      const result = await service.refreshToken(1, 'test@example.com');

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(1, 'test@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const userWithToken = {
        ...mockUser,
        isVerified: false,
        verificationToken: 'valid-token',
        verificationTokenExpires: new Date(Date.now() + 3600000),
      };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue({
        ...userWithToken,
        isVerified: true,
      });

      const result = await service.verifyEmail('valid-token');

      expect(result.isVerified).toBe(true);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already verified user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.verifyEmail('token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        isVerified: false,
        verificationToken: 'expired-token',
        verificationTokenExpires: new Date(Date.now() - 3600000),
      };
      userRepository.findOne.mockResolvedValue(userWithExpiredToken);

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateOAuthLogin', () => {
    it('should validate OAuth login for existing user', async () => {
      const oauthUser = { ...mockUser, googleId: 'google-id' };
      userRepository.findOne.mockResolvedValue(oauthUser);

      const result = await service.validateOAuthLogin(
        'google-id',
        mockUser.email,
      );

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        googleId: 'google-id',
      });
    });

    it('should create new OAuth user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.validateOAuthLogin(
        'google-id',
        'new@example.com',
      );

      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: mockUser.id });
    });

    it('should throw ConflictException for email linked to different Google account', async () => {
      const existingUser = { ...mockUser, googleId: 'different-google-id' };
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);

      await expect(
        service.validateOAuthLogin('google-id', mockUser.email),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for regular user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await expect(
        service.forgotPassword(mockUser.email),
      ).resolves.toBeUndefined();

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not send email for social login user', async () => {
      const socialUser = { ...mockUser, isSocial: true };
      userRepository.findOne.mockResolvedValue(socialUser);

      await expect(
        service.forgotPassword(mockUser.email),
      ).resolves.toBeUndefined();

      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.forgotPassword('nonexistent@example.com'),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const userWithResetToken = {
        ...mockUser,
        resetPasswordToken: 'valid-reset-token',
        resetPasswordTokenExpires: new Date(Date.now() + 3600000),
      };
      userRepository.findOne.mockResolvedValue(userWithResetToken);
      userRepository.save.mockResolvedValue({
        ...userWithResetToken,
        password: 'new-hashed-password',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword(
        'valid-reset-token',
        'newpassword123',
      );

      expect(result).toMatchObject({ id: mockUser.id });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid reset token', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired reset token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        resetPasswordToken: 'expired-token',
        resetPasswordTokenExpires: new Date(Date.now() - 3600000),
      };
      userRepository.findOne.mockResolvedValue(userWithExpiredToken);

      await expect(
        service.resetPassword('expired-token', 'newpassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      userRepository.findOne.mockResolvedValue(unverifiedUser);
      userRepository.save.mockResolvedValue(unverifiedUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      await expect(
        service.resendVerificationEmail(mockUser.email),
      ).resolves.toBeUndefined();

      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException for verified user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.resendVerificationEmail(mockUser.email),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for social login user', async () => {
      const socialUser = { ...mockUser, isSocial: true, isVerified: false };
      userRepository.findOne.mockResolvedValue(socialUser);

      await expect(
        service.resendVerificationEmail(mockUser.email),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail('nonexistent@example.com'),
      ).resolves.toBeUndefined();
    });
  });
});
