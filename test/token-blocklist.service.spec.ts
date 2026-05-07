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
    it('should add token to blocklist and detect it as blocked', async () => {
      const token = 'test-token-to-block';

      await service.add(token);

      const isBlocked = await service.isBlocked(token);
      expect(isBlocked).toBe(true);
    });

    it('should return false for non-blocked token', async () => {
      const token = 'never-blocked-token';

      const isBlocked = await service.isBlocked(token);
      expect(isBlocked).toBe(false);
    });

    it('should handle multiple tokens in blocklist', async () => {
      const token1 = 'blocked-token-1';
      const token2 = 'blocked-token-2';
      const token3 = 'not-blocked-token';

      await service.add(token1);
      await service.add(token2);

      expect(await service.isBlocked(token1)).toBe(true);
      expect(await service.isBlocked(token2)).toBe(true);
      expect(await service.isBlocked(token3)).toBe(false);
    });
  });
});