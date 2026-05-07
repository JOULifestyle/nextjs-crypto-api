import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from '../src/favorites/favorites.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../src/favorites/favorite.entity';
import { Crypto } from '../src/crypto/crypto.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteRepository: jest.Mocked<any>;
  let cryptoRepository: jest.Mocked<any>;

  const mockUserId = 1;

  const mockCrypto = {
    id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'BTC',
  currentPrice: 45000,
  marketCap: 850000000000,
  totalVolume: 25000000000,
  };

  const mockFavorite = {
    id: 1,
    user: { id: mockUserId },
    crypto: { id: 'bitcoin' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockFavoriteRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };

    const mockCryptoRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockFavoriteRepository,
        },
        {
          provide: getRepositoryToken(Crypto),
          useValue: mockCryptoRepository,
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    favoriteRepository = module.get(getRepositoryToken(Favorite));
    cryptoRepository = module.get(getRepositoryToken(Crypto));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addFavorite', () => {
    it('should add crypto to favorites successfully', async () => {
      cryptoRepository.findOne.mockResolvedValue(mockCrypto);
      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(mockUserId, 'bitcoin');

      expect(cryptoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'bitcoin' },
      });
      expect(favoriteRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: mockUserId }, crypto: { id: 'bitcoin'  } },
      });
      expect(favoriteRepository.create).toHaveBeenCalledWith({
        user: { id: mockUserId },
        crypto: { id: 'bitcoin' },
      });
      expect(result).toEqual(mockFavorite);
    });

    it('should throw NotFoundException when crypto does not exist', async () => {
      cryptoRepository.findOne.mockResolvedValue(null);

      await expect(service.addFavorite(mockUserId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when crypto already in favorites', async () => {
      cryptoRepository.findOne.mockResolvedValue(mockCrypto);
      favoriteRepository.findOne.mockResolvedValue(mockFavorite);

      await expect(service.addFavorite(mockUserId, 'bitcoin')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle database errors during save', async () => {
      cryptoRepository.findOne.mockResolvedValue(mockCrypto);
      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.addFavorite(mockUserId, 'bitcoin')).rejects.toThrow();
    });
  });

  describe('removeFavorite', () => {
    it('should remove crypto from favorites successfully', async () => {
      favoriteRepository.findOne.mockResolvedValue(mockFavorite);
      favoriteRepository.remove.mockResolvedValue(undefined);

      await service.removeFavorite(mockUserId, 'bitcoin');

      expect(favoriteRepository.findOne).toHaveBeenCalledWith({
        where: { user: { id: mockUserId }, crypto: { id: 'bitcoin' } },
      });
      expect(favoriteRepository.remove).toHaveBeenCalledWith(mockFavorite);
    });

    it('should throw NotFoundException when crypto not in favorites', async () => {
      favoriteRepository.findOne.mockResolvedValue(null);

      await expect(service.removeFavorite(mockUserId, 'bitcoin')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database remove errors', async () => {
      favoriteRepository.findOne.mockResolvedValue(mockFavorite);
      favoriteRepository.remove.mockRejectedValue(new Error('Database error'));

      await expect(service.removeFavorite(mockUserId, 'bitcoin')).rejects.toThrow();
    });
  });

  describe('getFavorites', () => {
    it('should return user favorites successfully', async () => {
      const mockFavorites = [mockFavorite];
      favoriteRepository.find.mockResolvedValue(mockFavorites);

      const result = await service.getFavorites(mockUserId);

      expect(favoriteRepository.find).toHaveBeenCalledWith({
        where: { user: { id: mockUserId } },
        relations: ['crypto'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockFavorites);
    });

    it('should return empty array when user has no favorites', async () => {
      favoriteRepository.find.mockResolvedValue([]);

      const result = await service.getFavorites(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle database query errors', async () => {
      favoriteRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getFavorites(mockUserId)).rejects.toThrow();
    });
  });
});