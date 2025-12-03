"use strict";
/**
 * Mock Supabase Client for testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockSupabaseClient = void 0;
// Mock query builder
const createMockQueryBuilder = () => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    // Default behavior - returns empty array
    then: jest.fn((resolve) => resolve({ data: [], error: null })),
});
exports.mockSupabaseClient = {
    from: jest.fn(() => createMockQueryBuilder()),
    auth: {
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn(),
    },
};
// Mock the supabase module
jest.mock('../../src/lib/supabase', () => ({
    __esModule: true,
    default: exports.mockSupabaseClient,
}));
exports.default = exports.mockSupabaseClient;
