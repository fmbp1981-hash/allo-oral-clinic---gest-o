/**
 * Mock Prisma Client for testing
 */

export const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  opportunity: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  clinicalRecord: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  settings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// Mock the prisma module
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient,
}));

export default mockPrismaClient;
