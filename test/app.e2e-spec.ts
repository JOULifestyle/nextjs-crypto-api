import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import request from 'supertest';

import { AuthModule } from '../src/auth/auth.module';
import { CryptoModule } from '../src/crypto/crypto.module';
import { FavoritesModule } from '../src/favorites/favorites.module';

import { User } from '../src/user/user.entity';
import { Crypto } from '../src/crypto/crypto.entity';
import { Favorite } from '../src/favorites/favorite.entity';

describe('App (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;
  let dataSource: DataSource;

  const testUser = {
    email: 'e2etest@example.com',
    password: 'password123',
    displayName: 'Test User',
  };

  const testCrypto = {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    currentPrice: 45000,
    marketCap: 850000000000,
    totalVolume: 25000000000,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_NAME', 'crypto_api_test'),
            entities: [User, Crypto, Favorite],
            synchronize: true,
            dropSchema: true,
            // Configure connection pool to prevent concurrent query issues
            poolSize: 5, // Limit connections to prevent pg deprecation warning
          }),
          inject: [ConfigService],
        }),
        AuthModule,
        CryptoModule,
        FavoritesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
}));
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should verify email', async () => {
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { email: testUser.email },
      });

      if (!user) throw new Error('User not found in test');

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: user.verificationToken })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should login user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');

      authToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;
    });

    it('should refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refresh_token).not.toBe(refreshToken);

      authToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;
    });

    it('should logout user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Re-login to get fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
 expect(loginResponse.status).toBe(201);
  expect(loginResponse.body.data).toHaveProperty('access_token');
      authToken = loginResponse.body.data.access_token;
      expect(authToken).toBeDefined();
  expect(authToken).not.toBeNull();
    });
  });

  describe('Crypto Operations', () => {
    beforeAll(async () => {
      // Create and verify user for this test suite (use different email to avoid conflicts)
      const cryptoUser = { ...testUser, email: 'crypto-test@example.com' };
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(cryptoUser);

      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { email: cryptoUser.email },
      });

      if (user?.verificationToken) {
        await request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({ token: user.verificationToken });
      }

      // Login and get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: cryptoUser.email,
          password: cryptoUser.password,
        });

      if (loginResponse.status === 201 && loginResponse.body.data) {
        authToken = loginResponse.body.data.access_token;
      }

      const cryptoRepository = dataSource.getRepository(Crypto);
      await cryptoRepository.save(testCrypto);
    });

    it('should get crypto data', async () => {
      const response = await request(app.getHttpServer())
        .get('/crypto')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject crypto fetch without auth', async () => {
      await request(app.getHttpServer())
        .post('/crypto/fetch')
        .expect(401);
    });

    it('should reject crypto get without auth', async () => {
      await request(app.getHttpServer())
        .get('/crypto')
        .expect(401);
    });
  });

  describe('Favorites Operations', () => {
    beforeAll(async () => {
      // Create and verify user for this test suite (use different email to avoid conflicts)
      const favoritesUser = { ...testUser, email: 'favorites-test@example.com' };
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(favoritesUser);

      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { email: favoritesUser.email },
      });

      if (user?.verificationToken) {
        await request(app.getHttpServer())
          .post('/auth/verify-email')
          .send({ token: user.verificationToken });
      }

      // Login and get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: favoritesUser.email,
          password: favoritesUser.password,
        });

      if (loginResponse.status === 201 && loginResponse.body.data) {
        authToken = loginResponse.body.data.access_token;
      }
    });
    it('should add crypto to favorites', async () => {
      const response = await request(app.getHttpServer())
        .post('/favorites/bitcoin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should not add duplicate favorite', async () => {
      await request(app.getHttpServer())
        .post('/favorites/bitcoin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });

    it('should get user favorites', async () => {
      const response = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should remove crypto from favorites', async () => {
      const response = await request(app.getHttpServer())
        .delete('/favorites/bitcoin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Advanced Authentication Edge Cases', () => {
    it('should reject refresh with expired refresh token', async () => {
      // First get a valid refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const refreshToken = loginResponse.body.data.refresh_token;

      // Manually expire the token by setting system time to future
      const originalDateNow = Date.now;
      const futureTime = originalDateNow() + (8 * 24 * 60 * 60 * 1000); // 8 days in future

      // Mock Date.now to simulate token expiration
      jest.spyOn(Date, 'now').mockReturnValue(futureTime);

      try {
        // Attempt to refresh with expired token
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Authorization', `Bearer ${refreshToken}`)
          .expect(401);
      } finally {
        // Restore original Date.now
        jest.restoreAllMocks();
      }
    });

    it('should reject requests with malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid-jwt-token',
        'Bearer invalid',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer not-a-jwt-at-all',
        '', // Empty token
      ];

      for (const token of malformedTokens) {
        await request(app.getHttpServer())
          .get('/crypto')
          .set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should handle email verification failure scenarios', async () => {
      // Register a user first to get a verification token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `verify-test-${Date.now()}@example.com`,
          password: 'password123',
          displayName: 'Verify Test User',
        });

      // Get the verification token from database
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { email: registerResponse.body.data.user.email },
      });

      expect(user).toBeTruthy();
      expect(user?.verificationToken).toBeTruthy();

      const validToken = user!.verificationToken;

      // Test 1: Invalid token
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token-123' })
        .expect(400);

      // Test 2: Reused token (verify once successfully)
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: validToken })
        .expect(201);

      // Test 3: Try to reuse the same token (should fail)
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: validToken })
        .expect(400);

      // Test 4: Expired token (simulate by modifying token expiry)
      const expiredUser = await userRepository.findOne({
        where: { email: registerResponse.body.data.user.email },
      });

      if (expiredUser) {
        // Set verification token expiry to past
        expiredUser.verificationTokenExpires = new Date(Date.now() - 3600000); // 1 hour ago
        await userRepository.save(expiredUser);

        // Create a new user to test expired token
        const expiredRegisterResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `expired-test-${Date.now()}@example.com`,
            password: 'password123',
            displayName: 'Expired Test User',
          });

        const expiredUserFromDb = await userRepository.findOne({
          where: { email: expiredRegisterResponse.body.data.user.email },
        });

        if (expiredUserFromDb?.verificationToken) {
          // Manually expire the token
          expiredUserFromDb.verificationTokenExpires = new Date(Date.now() - 3600000);
          await userRepository.save(expiredUserFromDb);

          await request(app.getHttpServer())
            .post('/auth/verify-email')
            .send({ token: expiredUserFromDb.verificationToken })
            .expect(400);
        }
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('should reject registration with missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'valid@example.com' })
        .expect(400);
    });

    it('should reject login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });
  });
});