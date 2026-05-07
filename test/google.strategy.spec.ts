import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { GoogleStrategy } from '../src/auth/google.strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    isVerified: true,
    isSocial: true,
    googleId: 'google-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'test-client-id',
          GOOGLE_CLIENT_SECRET: 'test-client-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
        };
        return config[key];
      }),
    };

    const mockAuthService = {
      validateOAuthLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate Google OAuth profile successfully', async () => {
    authService.validateOAuthLogin.mockResolvedValue(mockUser);

    const mockProfile = {
      id: 'google-123',
      emails: [{ value: 'test@example.com' }],
    };

    const mockDone = jest.fn();

    await strategy.validate('access-token', 'refresh-token', mockProfile as any, mockDone);

    expect(authService.validateOAuthLogin).toHaveBeenCalledWith(
      'google-123',
      'test@example.com'
    );
    expect(mockDone).toHaveBeenCalledWith(null, mockUser);
  });

  it('should handle OAuth validation errors', async () => {
    // Mock the service to reject with an error
    const mockError = new Error('OAuth validation failed');
    authService.validateOAuthLogin.mockImplementation(() => Promise.reject(mockError));

    const mockProfile = {
      id: 'google-123',
      emails: [{ value: 'test@example.com' }],
    };

    const mockDone = jest.fn();

    // The strategy should propagate the error through Passport's done callback
    await expect(strategy.validate('access-token', 'refresh-token', mockProfile as any, mockDone)).rejects.toThrow('OAuth validation failed');

    expect(authService.validateOAuthLogin).toHaveBeenCalledWith('google-123', 'test@example.com');
  });
});