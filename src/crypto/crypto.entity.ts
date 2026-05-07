import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Crypto {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 20, scale: 10 })
  currentPrice: number;

  @Column('decimal', { precision: 30, scale: 2, nullable: true })
  marketCap: number;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  totalVolume: number;

  @CreateDateColumn()
  fetchedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
