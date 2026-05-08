import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { TokenBlocklistService } from '../src/auth/token-blocklist.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let tokenBlocklistService: jest.Mocked<TokenBlocklistService>;

  beforeEach(async () => {
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
        { provide: TokenBlocklistService, useValue: mockTokenBlocklistService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    tokenBlocklistService = module.get(TokenBlocklistService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validate', () => {
    it('should validate JWT payload successfully', () => {
      tokenBlocklistService.isBlocked.mockReturnValue(false);

      const mockReq = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const result = strategy.validate(mockReq as any, {
        sub: 1,
        email: 'test@example.com',
      });

      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should reject blocked access token', () => {
      tokenBlocklistService.isBlocked.mockReturnValue(true);

      const mockReq = {
        headers: {
          authorization: 'Bearer blocked-token',
        },
      };

      expect(() =>
        strategy.validate(mockReq as any, {
          sub: 1,
          email: 'test@example.com',
        }),
      ).toThrow('Token has been invalidated');
    });

    it('should handle missing authorization header', () => {
      tokenBlocklistService.isBlocked.mockReturnValue(false);

      const mockReq = {
        headers: {},
      };

      const result = strategy.validate(mockReq as any, {
        sub: 1,
        email: 'test@example.com',
      });

      expect(result).toEqual({ id: 1, email: 'test@example.com' });
    });
  });
});
