/**
 * Setup file for Jest tests
 * This file runs before all tests
 */
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/clinica_test';
// Increase timeout for integration tests
jest.setTimeout(10000);
// Mock console methods to reduce noise in tests
global.console = Object.assign(Object.assign({}, console), { 
    // Keep these for debugging
    log: jest.fn(), debug: jest.fn(), info: jest.fn(), 
    // Keep error and warn for important messages
    error: console.error, warn: console.warn });
