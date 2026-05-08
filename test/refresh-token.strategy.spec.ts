import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { RefreshTokenStrategy } from '../src/auth/refresh-token.strategy';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;
  let userRepository: jest.Mocked<any>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    refreshToken: 'valid-refresh-token',
    refreshTokenExpires: new Date(Date.now() + 3600000), // 1 hour from now
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    strategy = module.get<RefreshTokenStrategy>(RefreshTokenStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should validate refresh token successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      };

      const result = await strategy.validate(mockReq as any, {
        sub: 1,
        email: 'test@example.com',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, email: 'test@example.com' },
      });
      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should reject expired refresh token', async () => {
      const expiredUser = {
        ...mockUser,
        refreshTokenExpires: new Date(Date.now() - 3600000), // 1 hour ago
      };
      userRepository.findOne.mockResolvedValue(expiredUser);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
        }),
      ).rejects.toThrow('Refresh token expired');
    });

    it('should reject when token does not match user token', async () => {
      const userWithDifferentToken = {
        ...mockUser,
        refreshToken: 'different-token',
      };
      userRepository.findOne.mockResolvedValue(userWithDifferentToken);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
        }),
      ).rejects.toThrow('Refresh token has been rotated');
    });

    it('should reject when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 999,
          email: 'nonexistent@example.com',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should reject when user has no refresh token', async () => {
      const userWithoutToken = { ...mockUser, refreshToken: null };
      userRepository.findOne.mockResolvedValue(userWithoutToken);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
        }),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should reject when no token provided', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const mockReq = {
        headers: {},
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
        }),
      ).rejects.toThrow('No token provided');
    });
  });
});
