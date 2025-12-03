import { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middlewares/validate.middleware';
import { z } from 'zod';

describe('Validate Middleware', () => {
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
            body: {},
        };

        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };

        jest.clearAllMocks();
    });

    it('should call next() when data is valid', () => {
        const schema = z.object({
            name: z.string(),
            email: z.string().email(),
            age: z.number().min(18),
        });

        mockRequest.body = {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 400 when data is invalid', () => {
        const schema = z.object({
            name: z.string(),
            email: z.string().email(),
        });

        mockRequest.body = {
            name: 'John Doe',
            email: 'invalid-email', // Invalid email
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation error',
        }));
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when required field is missing', () => {
        const schema = z.object({
            name: z.string(),
            email: z.string().email(),
        });

        mockRequest.body = {
            name: 'John Doe',
            // email is missing
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation error',
        }));
    });

    it('should include validation errors in response', () => {
        const schema = z.object({
            age: z.number().min(18, 'Must be at least 18'),
        });

        mockRequest.body = {
            age: 15, // Too young
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Validation error',
            details: expect.any(Array),
        }));
    });

    it('should handle nested object validation', () => {
        const schema = z.object({
            user: z.object({
                name: z.string(),
                email: z.string().email(),
            }),
        });

        mockRequest.body = {
            user: {
                name: 'John Doe',
                email: 'john@example.com',
            },
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle array validation', () => {
        const schema = z.object({
            items: z.array(z.string()).min(1),
        });

        mockRequest.body = {
            items: ['item1', 'item2'],
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid array items', () => {
        const schema = z.object({
            items: z.array(z.number()),
        });

        mockRequest.body = {
            items: ['not', 'numbers'], // Should be numbers
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should strip unknown fields when using strict schema', () => {
        const schema = z.object({
            name: z.string(),
        }).strict();

        mockRequest.body = {
            name: 'John Doe',
            unknownField: 'should be stripped',
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle optional fields correctly', () => {
        const schema = z.object({
            name: z.string(),
            nickname: z.string().optional(),
        });

        mockRequest.body = {
            name: 'John Doe',
            // nickname is optional, not provided
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle custom error messages', () => {
        const schema = z.object({
            password: z.string().min(8, 'Password must be at least 8 characters'),
        });

        mockRequest.body = {
            password: 'short',
        };

        const middleware = validate(schema);
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(400);
        const response = jsonMock.mock.calls[0][0];
        expect(response.details).toBeDefined();
    });
});
