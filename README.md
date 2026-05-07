<p align="center">
  <a href="https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml">
    <img src="https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>

  <a href="https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO">
    <img src="https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg" alt="Code Coverage" />
  </a>

  <img src="https://img.shields.io/badge/tests-112%20passed-brightgreen" alt="Tests Passed" />

  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

## Description

A production-focused NestJS REST API for cryptocurrency tracking and user authentication.

The application includes email/password authentication, Google OAuth, JWT access and refresh tokens, email verification, password reset flows, protected routes, rate limiting, and cryptocurrency data integration using the CoinGecko API.

The project uses PostgreSQL with TypeORM and includes comprehensive unit and end-to-end testing with Jest and Supertest.

## Features

- JWT authentication with refresh token rotation
- Email verification and password reset flows
- Google OAuth authentication
- Protected API routes
- Rate limiting with `@nestjs/throttler`
- Cryptocurrency data integration using CoinGecko
- User favorites management
- PostgreSQL + TypeORM
- Docker support for development and production
- Swagger API documentation
- Comprehensive unit and e2e testing
- GitHub Actions CI pipeline

## Architecture

The application follows a modular NestJS architecture with clear separation of concerns.

Main modules include:

- `AuthModule` for authentication and authorization
- `CryptoModule` for cryptocurrency data management
- `FavoritesModule` for user favorites
- `EmailModule` for transactional email handling

Authentication is implemented using JWT access and refresh tokens with Passport strategies.
```
src/
├── auth/
├── crypto/
├── favorites/
├── email/
├── shared/
```
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
docker compose up --build
```

The application will be available at `http://localhost:3000`

### Production Deployment

```bash
# Set environment variables in .env.production file
cp .env.example .env.production

# Start production containers
npm run docker:prod
# or
docker compose -f docker-compose.prod.yml up --build -d
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
docker compose logs -f app          # View app logs
docker compose logs -f db           # View database logs

# Database access
docker compose exec db psql -U postgres -d crypto_api

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

## Testing

The project includes both unit and end-to-end testing to validate business logic, authentication flows, API behavior, and error handling.

Unit tests focus on isolated service and controller logic, while e2e tests validate complete user workflows against a real test database.

Testing is implemented with Jest and Supertest.

### Testing Tools & Frameworks

- **Jest**
- **Supertest**
- **SQLite** (In-memory database)
- **TypeORM**

Unit tests cover:
- Services
- Controllers
- JWT and Passport strategies
- Error handling and edge cases
- Token management and authentication flows

E2E tests cover:
- Registration and login flows
- Email verification
- Protected routes
- Refresh token flow
- Input validation
- Duplicate resource handling
- Authentication and authorization failures

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests only
npm run test:e2e

# Run tests with coverage report
npm run test:cov

# Run e2e tests with coverage
npm run test:e2e:cov

# Run tests with debugging
npm run test:debug
```

### Coverage

Current unit test coverage:


```
| Metric     | Coverage |
|------------|----------|
| Statements |  94.3%   |
| Branches   |  81.7%   |
| Functions  |  90.9%   |
| Lines      |  93.7%   |

Test Suites: 12 passed
Tests: 112 passed
```

### Testing Principles

- Focus on meaningful business logic rather than shallow assertions
- Cover both success and failure scenarios
- Keep tests isolated and deterministic
- Test real user workflows with e2e tests
- Prioritize maintainability and readability

```
test/
├── app.e2e-spec.ts
├── auth.controller.spec.ts
├── auth.service.spec.ts
├── crypto.controller.spec.ts
├── crypto.service.spec.ts
├── favorites.controller.spec.ts
├── favorites.service.spec.ts
├── jwt.strategy.spec.ts
├── refresh-token.strategy.spec.ts
├── token-blocklist.service.spec.ts
├── setup.ts
└── jest-e2e.json
```

## CI/CD

GitHub Actions is used to automatically run linting, unit tests, and e2e tests on every push and pull request.

The CI pipeline helps ensure:
- consistent code quality
- reliable test coverage
- stable application behavior across changes
---

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

## Favorites (Requires JWT in Authorization header)

User favorites for cryptocurrencies. Allows users to save and manage their favorite cryptocurrencies.

- `POST /favorites/:cryptoId` - Add a cryptocurrency to favorites
- `DELETE /favorites/:cryptoId` - Remove a cryptocurrency from favorites
- `GET /favorites` - Get all favorite cryptocurrencies for the current user

## Root

- `GET /` - Hello message


## License

This project is licensed under the MIT License.