import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { Favorite } from './favorite.entity';
import { Crypto } from '../crypto/crypto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Crypto])],
  providers: [FavoritesService],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
