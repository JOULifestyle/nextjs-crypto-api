import { Test, TestingModule } from '@nestjs/testing';
import { CryptoController } from '../src/crypto/crypto.controller';
import { CryptoService } from '../src/crypto/crypto.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('CryptoController', () => {
  let controller: CryptoController;
  let cryptoService: jest.Mocked<CryptoService>;

  const mockCryptoData = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      currentPrice: 45000,
      marketCap: 850000000000,
      totalVolume: 25000000000,
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      currentPrice: 3000,
      marketCap: 360000000000,
      totalVolume: 15000000000,
    },
  ];

  beforeEach(async () => {
    const mockCryptoService = {
      fetchAndStoreCryptoData: jest.fn(),
      getCryptoData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CryptoController],
      providers: [
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    controller = module.get<CryptoController>(CryptoController);
    cryptoService = module.get(CryptoService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('fetchCryptoData', () => {
    it('should fetch and store crypto data successfully', async () => {
      cryptoService.fetchAndStoreCryptoData.mockResolvedValue(undefined);

      const result = await controller.fetchCryptoData();

      expect(cryptoService.fetchAndStoreCryptoData).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Crypto data fetched and stored' });
    });

    it('should handle API errors', async () => {
      cryptoService.fetchAndStoreCryptoData.mockRejectedValue(
        new InternalServerErrorException('Failed to fetch crypto data'),
      );

      await expect(controller.fetchCryptoData()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle network errors', async () => {
      cryptoService.fetchAndStoreCryptoData.mockRejectedValue(
        new Error('Network connection failed'),
      );

      await expect(controller.fetchCryptoData()).rejects.toThrow();
    });
  });

  describe('getCryptoData', () => {
    it('should return all crypto data successfully', async () => {
      cryptoService.getCryptoData.mockResolvedValue(mockCryptoData as any);

      const result = await controller.getCryptoData();

      expect(cryptoService.getCryptoData).toHaveBeenCalled();
      expect(result).toEqual(mockCryptoData);
    });

    it('should return empty array when no data available', async () => {
      cryptoService.getCryptoData.mockResolvedValue([]);

      const result = await controller.getCryptoData();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      cryptoService.getCryptoData.mockRejectedValue(
        new InternalServerErrorException('Database connection failed'),
      );

      await expect(controller.getCryptoData()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
