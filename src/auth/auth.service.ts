import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log('DEBUG: Validating user:', email);
    const user = await this.userRepository.findOne({ where: { email } });
    console.log('DEBUG: User found:', !!user);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('DEBUG: Password match:', isMatch);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async validateOAuthLogin(googleId: string, email: string): Promise<any> {
    let user = await this.userRepository.findOne({ where: { googleId } });
    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        user = this.userRepository.create({ email, googleId, isSocial: true });
        await this.userRepository.save(user);
      } else {
        user.googleId = googleId;
        user.isSocial = true;
        await this.userRepository.save(user);
      }
    }
    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(email: string, password: string, displayName?: string): Promise<any> {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('DEBUG: Registering user:', email, 'Hashed password length:', hashedPassword.length);
    const user = this.userRepository.create({ email, password: hashedPassword, displayName });
    await this.userRepository.save(user);
    const { password: _, ...result } = user;
    return result;
  }
}
