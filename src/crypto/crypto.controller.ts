import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crypto')
export class CryptoController {
  constructor(private cryptoService: CryptoService) {}

  @Post('fetch')
  @UseGuards(JwtAuthGuard)
  async fetchCryptoData() {
    await this.cryptoService.fetchAndStoreCryptoData();
    return { message: 'Crypto data fetched and stored' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCryptoData() {
    return this.cryptoService.getCryptoData();
  }
}
