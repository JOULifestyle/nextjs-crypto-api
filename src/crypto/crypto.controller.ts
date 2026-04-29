import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('crypto')
@Controller('crypto')
export class CryptoController {
  constructor(private cryptoService: CryptoService) {}

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Fetch and store top 10 cryptocurrencies from CoinGecko' })
  @ApiResponse({ status: 201, description: 'Crypto data fetched and stored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async fetchCryptoData() {
    await this.cryptoService.fetchAndStoreCryptoData();
    return { message: 'Crypto data fetched and stored' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get stored cryptocurrency data' })
  @ApiResponse({ status: 200, description: 'Crypto data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCryptoData() {
    return this.cryptoService.getCryptoData();
  }
}
