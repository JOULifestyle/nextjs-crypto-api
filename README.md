<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

A NestJS-based REST API for cryptocurrency data with comprehensive user authentication. Features include email/password registration with email verification, password reset, Google OAuth login, JWT refresh tokens for secure session management, fetching crypto data from CoinGecko, storing in PostgreSQL database, and serving data via protected endpoints with rate limiting.

## Project setup

```bash
# Copy example files and edit them
cp .env.example .env                    # for development
cp .env.example .env.production         # for production (then edit it)
```

### Environment Variables

For Docker deployment, set these environment variables in `.env` (development) or `.env.production` (production):

### Example Environment Variables

```env
# Database Configuration
DB_HOST=localhost                    # Use 'db' for Docker, 'localhost' for local
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-db-password  # Must match Docker setup
DB_NAME=crypto_api

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production  # Optional, defaults to JWT_SECRET

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Email Configuration (required for email verification and password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com
APP_URL=http://localhost:3000

# Application Configuration
NODE_ENV=development                 # or 'production'
PORT=3000
```

## Quick Start with Docker

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-crypto-api

# Copy environment file and edit with your values
cp .env.example .env

# Start the application with Docker Compose
npm run docker:dev
# or
docker-compose up --build
```

The application will be available at `http://localhost:3000`

### Production Deployment

```bash
# Set environment variables in .env.production file
cp .env.example .env.production

# Start production containers
npm run docker:prod
# or
docker-compose -f docker-compose.prod.yml up --build -d
```

### Docker Commands

```bash
# Development
npm run docker:dev          # Start development environment
npm run docker:dev:down     # Stop development environment

# Production
npm run docker:prod         # Start production environment
npm run docker:prod:down    # Stop production environment

# Logs
docker-compose logs -f app          # View app logs
docker-compose logs -f db           # View database logs

# Database access
docker-compose exec db psql -U postgres -d crypto_api

# Clean up
npm run docker:clean               # Remove all containers and volumes
```

## Security Features

- **Email verification required** for password accounts
- **Secure token-based verification** (24h expiry for email verification, 1h for password reset)
- **JWT tokens** for authenticated sessions (access token expires in 60 minutes, refresh token expires in 7 days)
- **Social login users** automatically verified
- **Rate limiting** with @nestjs/throttler:
  - Global: 10 requests per minute
  - Registration: 5 requests per minute
  - Login: 5 requests per 15 minutes
  - Password reset: 3 requests per minute
  - Email resend: 3 requests per minute

### Rate Limiting

When you exceed the rate limit, you'll receive:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Too many requests, please try again later."
}
```

## API Documentation

The API documentation is available via Swagger UI at `http://localhost:3000/api` when the application is running.

The documentation includes:
- Interactive API testing
- Request/response examples
- Authentication with JWT tokens
- Detailed endpoint descriptions

## Complete API Reference

### Authentication

#### Registration & Login
- `POST /auth/register` - Register user: `{ "email": "string", "password": "string", "displayName": "string" }`
  - Sends verification email automatically
  - User cannot login until email is verified
- `POST /auth/login` - Login: `{ "email": "string", "password": "string" }` → Returns access_token and refresh_token
  - Requires email verification before login
  - Access token expires in 60 minutes, refresh token expires in 7 days
- `POST /auth/refresh` - Refresh tokens: Use refresh_token in Authorization header → Returns new access_token and refresh_token
  - Generates new token pair and invalidates the old refresh token (token rotation)
- `POST /auth/logout` - Logout: Requires JWT in Authorization header → Logs out user by invalidating tokens

#### Email Verification
- `POST /auth/verify-email` - Verify email: `{ "token": "string" }`
  - Token received via email after registration
- `GET /auth/verify-email?token=<token>` - Verify email via link click
  - Returns HTML confirmation page
- `POST /auth/resend-verification` - Resend verification: `{ "email": "string" }`
  - For users who didn't receive the initial verification email
  - Cannot be used by already verified or social login users

#### Password Reset
- `POST /auth/forgot-password` - Request password reset: `{ "email": "string" }`
  - Sends reset email if account exists
- `POST /auth/reset-password` - Reset password: `{ "token": "string", "newPassword": "string" }`
  - Token received via email

#### Google OAuth
- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback (handled automatically)
  - Social login users are automatically verified

## Authentication Flow

### Email/Password Registration
1. User registers with email/password
2. System sends verification email with token
3. User clicks verification link → email verified
4. User can now login with email/password

### Password Reset
1. User requests password reset with email
2. System sends reset email with token (if account exists)
3. User clicks reset link or uses token in app
4. User sets new password

### Google OAuth
1. User clicks Google login
2. Redirected to Google for authentication
3. Google redirects back with user info
4. User is automatically logged in and verified

### Token Refresh
1. When access token expires, use refresh token to get new tokens
2. Send POST request to `/auth/refresh` with refresh token in Authorization header
3. Receive new access_token and refresh_token pair
4. Old refresh token is invalidated for security (token rotation)

## Crypto Data (Requires JWT in Authorization header)

- `POST /crypto/fetch` - Fetch and store top 10 cryptos from CoinGecko
- `GET /crypto` - Get stored crypto data

## Root

- `GET /` - Hello message

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).