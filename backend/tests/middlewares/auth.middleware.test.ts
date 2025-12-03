import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        nextFunction = jest.fn();

        mockRequest = {
            headers: {},
        };

        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };

        jest.clearAllMocks();
    });

    it('should call next() with valid token', () => {
        const mockPayload = {
            userId: 'user-123',
            email: 'test@example.com',
        };

        mockRequest.headers = {
            authorization: 'Bearer valid-token',
        };

        (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
        expect(mockRequest.user).toEqual(mockPayload);
        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', () => {
        mockRequest.headers = {};

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
        mockRequest.headers = {
            authorization: 'InvalidFormat token',
        };

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty after Bearer', () => {
        mockRequest.headers = {
            authorization: 'Bearer ',
        };

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
        mockRequest.headers = {
            authorization: 'Bearer invalid-token',
        };

        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
        mockRequest.headers = {
            authorization: 'Bearer expired-token',
        };

        const error = new Error('TokenExpiredError');
        error.name = 'TokenExpiredError';
        (jwt.verify as jest.Mock).mockImplementation(() => {
            throw error;
        });

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive Bearer', () => {
        const mockPayload = {
            userId: 'user-123',
            email: 'test@example.com',
        };

        mockRequest.headers = {
            authorization: 'bearer valid-token',
        };

        (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it('should attach user to request object', () => {
        const mockPayload = {
            userId: 'user-456',
            email: 'user@example.com',
            name: 'Test User',
        };

        mockRequest.headers = {
            authorization: 'Bearer valid-token',
        };

        (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

        authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockRequest.user).toEqual(mockPayload);
        expect(mockRequest.user?.userId).toBe('user-456');
        expect(mockRequest.user?.email).toBe('user@example.com');
    });
});
