/**
 * Unit tests for Auth Controller
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { login, register, refresh } from '../src/controllers/auth.controller';
import prisma from '../src/lib/prisma';

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
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
    it('should login successfully with valid credentials', async () => {
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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token-mock')
        .mockReturnValueOnce('refresh-token-mock');

      await login(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
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
    });

    it('should return 401 when user not found', async () => {
      mockRequest.body = {
        email: 'notfound@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 401 when password is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedPassword123',
      };

      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error logging in' });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token-mock')
        .mockReturnValueOnce('refresh-token-mock');

      await register(mockRequest as Request, mockResponse as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
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
    });

    it('should return 400 when user already exists', async () => {
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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User already exists' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        clinicName: 'New Clinic',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await register(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error registering user' });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockRequest.body = {
        refreshToken: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-1',
        type: 'refresh',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        process.env.JWT_REFRESH_SECRET
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(jsonMock).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should return 401 when refresh token is missing', async () => {
      mockRequest.body = {};

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Refresh token required' });
    });

    it('should return 401 when token type is invalid', async () => {
      mockRequest.body = {
        refreshToken: 'invalid-token-type',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-1',
        type: 'access', // Wrong type
      });

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token type' });
    });

    it('should return 401 when user not found', async () => {
      mockRequest.body = {
        refreshToken: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-999',
        type: 'refresh',
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 401 when JWT verification fails', async () => {
      mockRequest.body = {
        refreshToken: 'invalid-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.body = {
        refreshToken: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await refresh(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error refreshing token' });
    });
  });
});
