import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/user.entity';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { TokenBlocklistService } from '../src/auth/token-blocklist.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<any>;
  let tokenBlocklistService: jest.Mocked<TokenBlocklistService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockTokenBlocklistService = {
      isBlocked: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: TokenBlocklistService, useValue: mockTokenBlocklistService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
    tokenBlocklistService = module.get(TokenBlocklistService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should validate JWT payload successfully', async () => {
      tokenBlocklistService.isBlocked.mockReturnValue(false);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const result = await strategy.validate(mockReq as any, {
        sub: 1,
        email: 'test@example.com',
        type: 'access',
      });

      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should reject blocked access token', async () => {
      tokenBlocklistService.isBlocked.mockReturnValue(true);

      const mockReq = {
        headers: {
          authorization: 'Bearer blocked-token',
        },
      };

      await expect(
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
          type: 'access',
        }),
      ).rejects.toThrow('Token has been invalidated');
    });

    it('should handle missing authorization header', async () => {
      tokenBlocklistService.isBlocked.mockReturnValue(false);

      const mockReq = {
        headers: {},
      };

      const result = await strategy.validate(mockReq as any, {
        sub: 1,
        email: 'test@example.com',
        type: 'access',
      });

      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });
  });
});