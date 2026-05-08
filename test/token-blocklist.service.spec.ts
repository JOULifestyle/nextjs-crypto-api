import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlocklistService } from '../src/auth/token-blocklist.service';

describe('TokenBlocklistService', () => {
  let service: TokenBlocklistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenBlocklistService],
    }).compile();

    service = module.get<TokenBlocklistService>(TokenBlocklistService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('add and isBlocked', () => {
    it('should add token to blocklist and detect it as blocked', () => {
      const token = 'test-token-to-block';

      service.add(token);

      const isBlocked = service.isBlocked(token);
      expect(isBlocked).toBe(true);
    });

    it('should return false for non-blocked token', () => {
      const token = 'never-blocked-token';

      const isBlocked = service.isBlocked(token);
      expect(isBlocked).toBe(false);
    });

    it('should handle multiple tokens in blocklist', () => {
      const token1 = 'blocked-token-1';
      const token2 = 'blocked-token-2';
      const token3 = 'not-blocked-token';

      service.add(token1);
      service.add(token2);

      expect(service.isBlocked(token1)).toBe(true);
      expect(service.isBlocked(token2)).toBe(true);
      expect(service.isBlocked(token3)).toBe(false);
    });
  });
});
