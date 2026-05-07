import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesController } from '../src/favorites/favorites.controller';
import { FavoritesService } from '../src/favorites/favorites.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../src/favorites/favorite.entity';
import { Crypto } from '../src/crypto/crypto.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../src/types';

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let favoritesService: jest.Mocked<FavoritesService>;

  const mockUser = { id: 1, email: 'test@example.com' };
  const mockRequest = { user: mockUser } as unknown as AuthenticatedRequest;

  const mockFavorite = {
    id: 1,
    user: { id: 1 },
    crypto: { id: 'bitcoin' },
    createdAt: new Date(),
  };

  const mockFavorites = [mockFavorite];

  beforeEach(async () => {
    const mockFavoritesService = {
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      getFavorites: jest.fn(),
    };

    const mockFavoriteRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    const mockCryptoRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesController],
      providers: [
        {
          provide: FavoritesService,
          useValue: mockFavoritesService,
        },
        {
          provide: getRepositoryToken(Favorite),
          useValue: mockFavoriteRepository,
        },
        {
          provide: getRepositoryToken(Crypto),
          useValue: mockCryptoRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FavoritesController>(FavoritesController);
    favoritesService = module.get(FavoritesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addFavorite', () => {
    it('should add crypto to favorites successfully', async () => {
      favoritesService.addFavorite.mockResolvedValue(mockFavorite as any);

      const result = await controller.addFavorite(mockRequest, 'bitcoin');

      expect(favoritesService.addFavorite).toHaveBeenCalledWith(1, 'bitcoin');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFavorite);
    });

    it('should handle adding already favorited crypto', async () => {
      favoritesService.addFavorite.mockRejectedValue(
        new ConflictException('Already in favorites'),
      );

      await expect(controller.addFavorite(mockRequest, 'bitcoin')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle invalid crypto ID', async () => {
      favoritesService.addFavorite.mockRejectedValue(
        new NotFoundException('Crypto not found'),
      );

      await expect(controller.addFavorite(mockRequest, 'invlid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove crypto from favorites successfully', async () => {
      favoritesService.removeFavorite.mockResolvedValue(undefined);

      const result = await controller.removeFavorite(mockRequest, 'bitcoin');

      expect(favoritesService.removeFavorite).toHaveBeenCalledWith(1, 'bitcoin');
      expect(result.success).toBe(true);
    });

    it('should handle removing non-favorited crypto', async () => {
      favoritesService.removeFavorite.mockRejectedValue(
        new NotFoundException('Favorite not found'),
      );

      await expect(controller.removeFavorite(mockRequest, 'bitcoin')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFavorites', () => {
    it('should return user favorites successfully', async () => {
      favoritesService.getFavorites.mockResolvedValue(mockFavorites as any);

      const result = await controller.getFavorites(mockRequest);

      expect(favoritesService.getFavorites).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFavorites);
    });

    it('should return empty array when no favorites exist', async () => {
      favoritesService.getFavorites.mockResolvedValue([]);

      const result = await controller.getFavorites(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});