import { Request, Response } from 'express';
import * as AuthController from '../../src/controllers/auth.controller';
import supabase from '../../src/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            mockRequest = {
                body: { email: 'test@example.com', password: 'password123' },
            };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                refresh_token_hash: 'oldHash',
            };

            // Mock Supabase response
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                    }),
                }),
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null }),
                }),
            });

            // Mock bcrypt
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Mock jwt
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            await AuthController.login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).not.toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                accessToken: 'mock-token',
                refreshToken: 'mock-token',
            }));
        });

        it('should return 401 for invalid credentials', async () => {
            mockRequest = {
                body: { email: 'test@example.com', password: 'wrongpassword' },
            };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                    }),
                }),
            });

            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await AuthController.login(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        });
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            mockRequest = {
                body: {
                    name: 'Test User',
                    email: 'new@example.com',
                    password: 'password123',
                    clinicName: 'Test Clinic',
                },
            };

            // Mock user check (not found)
            const selectMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null }),
                }),
            });

            // Mock insert
            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'new-user-123', email: 'new@example.com' },
                        error: null,
                    }),
                }),
            });

            // Mock update (refresh token)
            const updateMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            (supabase.from as jest.Mock).mockImplementation((table) => {
                if (table === 'users') {
                    return {
                        select: selectMock,
                        insert: insertMock,
                        update: updateMock,
                    };
                }
                return {};
            });

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            await AuthController.register(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                accessToken: 'mock-token',
                refreshToken: 'mock-token',
            }));
        });
    });
});
