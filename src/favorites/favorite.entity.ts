import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Crypto } from '../crypto/crypto.entity';

@Entity()
@Unique(['user', 'crypto']) // prevent duplicate favorites
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Crypto, { onDelete: 'CASCADE' })
  crypto: Crypto;

  @CreateDateColumn()
  createdAt: Date;
}