import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlocklistService {
  private blocklist = new Set<string>();

  add(token: string): void {
    this.blocklist.add(token);
  }

  isBlocked(token: string): boolean {
    return this.blocklist.has(token);
  }
}
