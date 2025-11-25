import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Crypto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 20, scale: 10 })
  price: number;

  @Column('decimal', { precision: 30, scale: 2, nullable: true })
  marketCap: number;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  volume24h: number;

  @CreateDateColumn()
  fetchedAt: Date;
}