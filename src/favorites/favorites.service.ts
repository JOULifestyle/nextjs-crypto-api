import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { Crypto } from '../crypto/crypto.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    @InjectRepository(Crypto)
    private cryptoRepository: Repository<Crypto>,
  ) {}

  async addFavorite(userId: number, cryptoId: string): Promise<Favorite> {
    const crypto = await this.cryptoRepository.findOne({
      where: { id: cryptoId },
    });

    if (!crypto) {
      throw new NotFoundException('Crypto not found');
    }

    const existing = await this.favoriteRepository.findOne({
      where: { user: { id: userId }, crypto: { id: cryptoId } },
    });

    if (existing) {
      throw new ConflictException('Already in favorites');
    }

    const favorite = this.favoriteRepository.create({
      user: { id: userId },
      crypto: { id: cryptoId },
    });

    return this.favoriteRepository.save(favorite);
  }

  async removeFavorite(userId: number, cryptoId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { user: { id: userId }, crypto: { id: cryptoId } },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepository.remove(favorite);
  }

  async getFavorites(userId: number): Promise<Favorite[]> {
    return this.favoriteRepository.find({
      where: { user: { id: userId } },
      relations: ['crypto'],
      order: { createdAt: 'DESC' },
    });
  }
}