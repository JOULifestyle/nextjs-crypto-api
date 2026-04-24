import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { CryptoController } from './crypto.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crypto } from './crypto.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Crypto]), HttpModule],
  providers: [CryptoService],
  controllers: [CryptoController],
})
export class CryptoModule {}
