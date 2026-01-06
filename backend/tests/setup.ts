// Mock logger to avoid noise in tests
jest.mock('../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global setup if needed
beforeAll(() => {
  // Environment variables for testing - JWT_SECRET needs at least 32 characters
  process.env.JWT_SECRET = 'test-secret-key-must-be-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-must-be-at-least-32-characters-long';
  process.env.NODE_ENV = 'test';
});

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
});

// Utility to create mock authenticated request
export const createMockAuthRequest = (overrides = {}) => ({
  user: {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
  },
  params: {},
  query: {},
  body: {},
  ...overrides,
});

// Utility to create mock response
export const createMockResponse = () => {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    status: statusMock,
    json: jsonMock,
    statusMock,
    jsonMock,
  };
};
