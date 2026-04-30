import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../types';

@ApiTags('favorites')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Post(':cryptoId')
  @ApiOperation({ summary: 'Add a crypto to favorites' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 404, description: 'Crypto not found' })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  async addFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('cryptoId', ParseIntPipe) cryptoId: number,
  ) {
    const favorite = await this.favoritesService.addFavorite(
      req.user.id,
      cryptoId,
    );
    return { success: true, data: favorite, message: 'Added to favorites' };
  }

  @Delete(':cryptoId')
  @ApiOperation({ summary: 'Remove a crypto from favorites' })
  @ApiResponse({ status: 200, description: 'Removed from favorites' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async removeFavorite(
    @Request() req: AuthenticatedRequest,
    @Param('cryptoId', ParseIntPipe) cryptoId: number,
  ) {
    await this.favoritesService.removeFavorite(req.user.id, cryptoId);
    return { success: true, data: null, message: 'Removed from favorites' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all favorites for current user' })
  @ApiResponse({ status: 200, description: 'List of favorites' })
  async getFavorites(@Request() req: AuthenticatedRequest) {
    const favorites = await this.favoritesService.getFavorites(req.user.id);
    return { success: true, data: favorites, message: 'Favorites retrieved' };
  }
}