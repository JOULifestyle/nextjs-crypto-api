// test/setup.ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.EMAIL_HOST = 'localhost';
process.env.EMAIL_PORT = '1025';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@example.com';
process.env.APP_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

jest.setTimeout(30000);

global.testUtils = {
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  randomString: (length: number = 10) =>
    Math.random()
      .toString(36)
      .substring(2, length + 2),
  randomEmail: () =>
    `test-${Math.random().toString(36).substring(2, 8)}@example.com`,
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  }),
}));
