import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crypto } from './crypto.entity';
import { firstValueFrom } from 'rxjs';
import { CoinGeckoCoin } from 'src/types';

@Injectable()
export class CryptoService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(Crypto)
    private cryptoRepository: Repository<Crypto>,
  ) {}

  async fetchAndStoreCryptoData(): Promise<void> {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1';
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

     if (!data || !Array.isArray(data)) {
      throw new Error('Invalid API response');
    }

    const cryptos = data.map((coin: CoinGeckoCoin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      currentPrice: coin.current_price ?? null,
      marketCap: coin.market_cap ?? null,
      totalVolume: coin.total_volume ?? null,
    }));

      await this.cryptoRepository.upsert(cryptos, ['id']);
    }
  

  async getCryptoData(): Promise<Crypto[]> {
    return this.cryptoRepository.find({
      order: { fetchedAt: 'DESC' },
      take: 10,
    });
  }
}
