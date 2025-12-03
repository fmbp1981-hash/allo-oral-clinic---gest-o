"use strict";
/**
 * Unit tests for Auth Controller
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_controller_1 = require("../src/controllers/auth.controller");
const prisma_1 = require("../src/lib/prisma");
// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));
// Mock bcrypt
jest.mock('bcryptjs');
// Mock jwt
jest.mock('jsonwebtoken');
describe('Auth Controller', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            body: {},
        };
        mockResponse = {
            json: jsonMock,
            status: statusMock,
        };
        jest.clearAllMocks();
    });
    describe('login', () => {
        it('should login successfully with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashedPassword123',
                name: 'Test User',
                clinicName: 'Test Clinic',
            };
            mockRequest.body = {
                email: 'test@example.com',
                password: 'password123',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('access-token-mock')
                .mockReturnValueOnce('refresh-token-mock');
            yield (0, auth_controller_1.login)(mockRequest, mockResponse);
            expect(prisma_1.default.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(bcryptjs_1.default.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
            expect(jsonMock).toHaveBeenCalledWith({
                user: {
                    id: 'user-1',
                    email: 'test@example.com',
                    name: 'Test User',
                    clinicName: 'Test Clinic',
                },
                token: 'access-token-mock',
                accessToken: 'access-token-mock',
                refreshToken: 'refresh-token-mock',
            });
        }));
        it('should return 401 when user not found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                email: 'notfound@example.com',
                password: 'password123',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(null);
            yield (0, auth_controller_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        }));
        it('should return 401 when password is invalid', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                password: 'hashedPassword123',
            };
            mockRequest.body = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(false);
            yield (0, auth_controller_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                email: 'test@example.com',
                password: 'password123',
            };
            prisma_1.default.user.findUnique.mockRejectedValue(new Error('DB Error'));
            yield (0, auth_controller_1.login)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error logging in' });
        }));
    });
    describe('register', () => {
        it('should register a new user successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = {
                id: 'user-1',
                email: 'newuser@example.com',
                password: 'hashedPassword123',
                name: 'New User',
                clinicName: 'New Clinic',
                avatarUrl: null,
            };
            mockRequest.body = {
                name: 'New User',
                email: 'newuser@example.com',
                password: 'password123',
                clinicName: 'New Clinic',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(null);
            bcryptjs_1.default.hash.mockResolvedValue('hashedPassword123');
            prisma_1.default.user.create.mockResolvedValue(mockUser);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('access-token-mock')
                .mockReturnValueOnce('refresh-token-mock');
            yield (0, auth_controller_1.register)(mockRequest, mockResponse);
            expect(prisma_1.default.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'newuser@example.com' },
            });
            expect(bcryptjs_1.default.hash).toHaveBeenCalledWith('password123', 10);
            expect(prisma_1.default.user.create).toHaveBeenCalledWith({
                data: {
                    name: 'New User',
                    email: 'newuser@example.com',
                    password: 'hashedPassword123',
                    clinicName: 'New Clinic',
                    avatarUrl: undefined,
                },
            });
            expect(jsonMock).toHaveBeenCalledWith({
                user: {
                    id: 'user-1',
                    email: 'newuser@example.com',
                    name: 'New User',
                    clinicName: 'New Clinic',
                    avatarUrl: null,
                },
                token: 'access-token-mock',
                accessToken: 'access-token-mock',
                refreshToken: 'refresh-token-mock',
            });
        }));
        it('should return 400 when user already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            const existingUser = {
                id: 'user-1',
                email: 'existing@example.com',
            };
            mockRequest.body = {
                name: 'New User',
                email: 'existing@example.com',
                password: 'password123',
                clinicName: 'New Clinic',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(existingUser);
            yield (0, auth_controller_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User already exists' });
            expect(prisma_1.default.user.create).not.toHaveBeenCalled();
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                name: 'New User',
                email: 'newuser@example.com',
                password: 'password123',
                clinicName: 'New Clinic',
            };
            prisma_1.default.user.findUnique.mockResolvedValue(null);
            bcryptjs_1.default.hash.mockResolvedValue('hashedPassword123');
            prisma_1.default.user.create.mockRejectedValue(new Error('DB Error'));
            yield (0, auth_controller_1.register)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error registering user' });
        }));
    });
    describe('refresh', () => {
        it('should refresh tokens successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
            };
            mockRequest.body = {
                refreshToken: 'valid-refresh-token',
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: 'user-1',
                type: 'refresh',
            });
            prisma_1.default.user.findUnique.mockResolvedValue(mockUser);
            jsonwebtoken_1.default.sign
                .mockReturnValueOnce('new-access-token')
                .mockReturnValueOnce('new-refresh-token');
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(jsonwebtoken_1.default.verify).toHaveBeenCalledWith('valid-refresh-token', process.env.JWT_REFRESH_SECRET);
            expect(prisma_1.default.user.findUnique).toHaveBeenCalledWith({
                where: { id: 'user-1' },
            });
            expect(jsonMock).toHaveBeenCalledWith({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
            });
        }));
        it('should return 401 when refresh token is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {};
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Refresh token required' });
        }));
        it('should return 401 when token type is invalid', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                refreshToken: 'invalid-token-type',
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: 'user-1',
                type: 'access', // Wrong type
            });
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token type' });
        }));
        it('should return 401 when user not found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                refreshToken: 'valid-refresh-token',
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: 'user-999',
                type: 'refresh',
            });
            prisma_1.default.user.findUnique.mockResolvedValue(null);
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
        }));
        it('should return 401 when JWT verification fails', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                refreshToken: 'invalid-token',
            };
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new jsonwebtoken_1.default.JsonWebTokenError('Invalid token');
            });
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
        }));
        it('should return 500 on unexpected error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                refreshToken: 'valid-refresh-token',
            };
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            yield (0, auth_controller_1.refresh)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error refreshing token' });
        }));
    });
});
