import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';
import { LocalStrategy } from '../src/auth/local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    isVerified: true,
    isSocial: false,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate user credentials successfully', async () => {
    authService.validateUser.mockResolvedValue(mockUser);

    const result = await strategy.validate('test@example.com', 'password123');

    expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result).toEqual(mockUser);
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(strategy.validate('test@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);

    expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
  });

  it('should handle validation service errors', async () => {
    authService.validateUser.mockRejectedValue(new Error('Database connection failed'));

    await expect(strategy.validate('test@example.com', 'password123')).rejects.toThrow();

    expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});