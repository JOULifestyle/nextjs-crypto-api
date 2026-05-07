import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from '../src/crypto/crypto.service';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Crypto } from '../src/crypto/crypto.entity';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { InternalServerErrorException } from '@nestjs/common';

describe('CryptoService', () => {
  let service: CryptoService;
  let httpService: jest.Mocked<HttpService>;
  let cryptoRepository: jest.Mocked<any>;

  const mockApiResponse: AxiosResponse = {
    data: [
      {
        id: 'bitcoin',
        name: 'Bitcoin',
        symbol: 'BTC',
        current_price: 45000,
        market_cap: 850000000000,
        total_volume: 25000000000,
      },
      {
        id: 'ethereum',
        name: 'Ethereum',
        symbol: 'ETH',
        current_price: 3000,
        market_cap: 360000000000,
        total_volume: 15000000000,
      },
    ],
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };

  const mockCryptoEntity = {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    currentPrice: 45000,
    marketCap: 850000000000,
    totalVolume: 25000000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
    };

    const mockCryptoRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRepositoryToken(Crypto),
          useValue: mockCryptoRepository,
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    httpService = module.get(HttpService);
    cryptoRepository = module.get(getRepositoryToken(Crypto));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAndStoreCryptoData', () => {
    it('should fetch and store crypto data successfully', async () => {
      httpService.get.mockReturnValue(of(mockApiResponse));
      cryptoRepository.upsert.mockResolvedValue(undefined);

      await service.fetchAndStoreCryptoData();

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1'
      );
      expect(cryptoRepository.upsert).toHaveBeenCalledWith(
  expect.any(Array),
  ['id'],
);
    });

    it('should handle API errors', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('API Error')));

      await expect(service.fetchAndStoreCryptoData()).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('Timeout')));

      await expect(service.fetchAndStoreCryptoData()).rejects.toThrow();
    });

    it('should handle malformed API response', async () => {
      const malformedResponse = { ...mockApiResponse, data: null };
      httpService.get.mockReturnValue(of(malformedResponse));

      await expect(service.fetchAndStoreCryptoData()).rejects.toThrow();
    });

    it('should handle database save errors', async () => {
      httpService.get.mockReturnValue(of(mockApiResponse));
      cryptoRepository.upsert.mockRejectedValue(new Error('Database error'));

      await expect(service.fetchAndStoreCryptoData()).rejects.toThrow();
    });
  });

  describe('getCryptoData', () => {
    it('should return crypto data successfully', async () => {
      cryptoRepository.find.mockResolvedValue([mockCryptoEntity]);

      const result = await service.getCryptoData();

      expect(cryptoRepository.find).toHaveBeenCalledWith({
        order: { fetchedAt: 'DESC' },
        take: 10,
      });
      expect(result).toEqual([mockCryptoEntity]);
    });

    it('should return empty array when no data exists', async () => {
      cryptoRepository.find.mockResolvedValue([]);

      const result = await service.getCryptoData();

      expect(result).toEqual([]);
    });

    it('should handle database query errors', async () => {
      cryptoRepository.find.mockRejectedValue(new Error('Database query failed'));

      await expect(service.getCryptoData()).rejects.toThrow();
    });
  });

  describe('data transformation', () => {
    it('should properly transform API data to entity format', async () => {
      httpService.get.mockReturnValue(of(mockApiResponse));
      cryptoRepository.upsert.mockResolvedValue(undefined);

      await service.fetchAndStoreCryptoData();

      expect(cryptoRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            currentPrice: 45000,
            marketCap: 850000000000,
            totalVolume: 25000000000,
          }),
        ]),
        ['id'],
      );
    });

    it('should handle missing optional fields in API response', async () => {
      const responseWithMissingFields = {
        ...mockApiResponse,
        data: [
          {
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            current_price: 45000,
            // Missing market_cap and total_volume
          },
        ],
      };

      httpService.get.mockReturnValue(of(responseWithMissingFields));
      cryptoRepository.upsert.mockResolvedValue(undefined);

      await service.fetchAndStoreCryptoData();

      expect(cryptoRepository.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            currentPrice: 45000,
            marketCap: null,
            totalVolume: null,
          }),
        ]),
        ['id'],
      );
    });
  });
});
