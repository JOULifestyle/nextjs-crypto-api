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

A NestJS-based REST API for cryptocurrency data with comprehensive user authentication. Features include email/password registration with email verification, password reset, Google OAuth login, fetching crypto data from CoinGecko, storing in PostgreSQL database, and serving data via protected endpoints.

## Project setup

```bash
$ npm install
$ cp .env.example .env
```

**Required Configuration:**

- Database: PostgreSQL connection details
- Authentication: JWT secret and Google OAuth credentials
- **Email: SMTP configuration for email verification and password reset**

Edit `.env` with your actual values:

### Database

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USERNAME`: PostgreSQL username (default: postgres)
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: PostgreSQL database name (default: crypto_api)

### Authentication

- `JWT_SECRET`: A secure random string for JWT signing
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: From Google OAuth app
- `GOOGLE_CALLBACK_URL`: Update if deploying (default for local dev)

### Email (Required for email verification and password reset)

- `EMAIL_HOST`: SMTP host (default: smtp.gmail.com)
- `EMAIL_PORT`: SMTP port (default: 587)
- `EMAIL_USER`: SMTP username/email
- `EMAIL_PASSWORD`: SMTP password (use App Password for Gmail)
- `EMAIL_FROM`: From email address for sent emails
- `APP_URL`: Base URL for email links (default: http://localhost:3000)

**Note:** For Gmail, enable 2FA and create an "App Password" to use as EMAIL_PASSWORD.

### App

- `PORT`: Server port (default: 3000)

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

### Authentication

#### Registration & Login

- `POST /auth/register` - Register user: `{ "email": "string", "password": "string", "displayName": "string" }`
  - Sends verification email automatically
  - User cannot login until email is verified
- `POST /auth/login` - Login: `{ "email": "string", "password": "string" }` → Returns JWT
  - Requires email verification before login

#### Email Verification

- `POST /auth/verify-email` - Verify email: `{ "token": "string" }`
  - Token received via email after registration
- `GET /auth/verify-email?token=<token>` - Verify email via link click
  - Returns HTML confirmation page

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

### Security Features

- Email verification required for password accounts
- Secure token-based verification (24h expiry)
- Secure password reset (1h expiry)
- JWT tokens for authenticated sessions
- Social login users automatically verified

### Crypto Data (Requires JWT in Authorization header)

- `POST /crypto/fetch` - Fetch and store top 10 cryptos from CoinGecko
- `GET /crypto` - Get stored crypto data

### Root

- `GET /` - Hello message

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
