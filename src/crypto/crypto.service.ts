import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crypto } from './crypto.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CryptoService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(Crypto)
    private cryptoRepository: Repository<Crypto>,
  ) {}

  async fetchAndStoreCryptoData() {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1';
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    for (const coin of data) {
      const crypto = this.cryptoRepository.create({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.current_price,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
      });
      await this.cryptoRepository.save(crypto);
    }
  }

  async getCryptoData() {
    return this.cryptoRepository.find({
      order: { fetchedAt: 'DESC' },
      take: 10,
    });
  }
}
