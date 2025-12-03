import { Request, Response } from 'express';
import * as UserController from '../../src/controllers/user.controller';
import supabase from '../../src/lib/supabase';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));
jest.mock('bcryptjs');

describe('User Controller', () => {
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

    describe('getUsers', () => {
        it('should return all users successfully', async () => {
            mockRequest = {};

            const mockUsers = [
                {
                    id: 'user-1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    clinic_name: 'Clinic A',
                },
                {
                    id: 'user-2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    clinic_name: 'Clinic B',
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
                }),
            });

            await UserController.getUsers(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUsers);
        });

        it('should return empty array when no users', async () => {
            mockRequest = {};

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await UserController.getUsers(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should not return password field', async () => {
            mockRequest = {};

            const selectMock = jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                select: selectMock,
            });

            await UserController.getUsers(mockRequest as Request, mockResponse as Response);

            // Verify that password is not in the select
            expect(selectMock).toHaveBeenCalledWith(expect.not.stringContaining('password'));
        });
    });

    describe('getUserById', () => {
        it('should return user by ID successfully', async () => {
            mockRequest = {
                params: { id: 'user-123' },
            };

            const mockUser = {
                id: 'user-123',
                name: 'John Doe',
                email: 'john@example.com',
                clinic_name: 'Clinic A',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                    }),
                }),
            });

            await UserController.getUserById(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUser);
        });

        it('should return 404 when user not found', async () => {
            mockRequest = {
                params: { id: 'non-existent' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                    }),
                }),
            });

            await UserController.getUserById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
        });
    });

    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            mockRequest = {
                body: {
                    name: 'New User',
                    email: 'newuser@example.com',
                    password: 'Password123!',
                    clinicName: 'New Clinic',
                    avatarUrl: 'https://example.com/avatar.jpg',
                },
            };

            const mockUser = {
                id: 'new-user-id',
                name: 'New User',
                email: 'newuser@example.com',
                clinic_name: 'New Clinic',
                avatar_url: 'https://example.com/avatar.jpg',
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
                    single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                }),
            });

            (supabase.from as jest.Mock).mockImplementation(() => ({
                select: selectMock,
                insert: insertMock,
            }));

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New User',
                email: 'newuser@example.com',
                password: 'hashedPassword123',
                clinic_name: 'New Clinic',
                avatar_url: 'https://example.com/avatar.jpg',
            }));
            expect(jsonMock).toHaveBeenCalledWith(mockUser);
        });

        it('should return 400 if user already exists', async () => {
            mockRequest = {
                body: {
                    name: 'Existing User',
                    email: 'existing@example.com',
                    password: 'Password123!',
                },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { id: 'existing-id' } }),
                    }),
                }),
            });

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'User already exists' });
        });

        it('should handle creation error', async () => {
            mockRequest = {
                body: {
                    name: 'New User',
                    email: 'newuser@example.com',
                    password: 'Password123!',
                },
            };

            const selectMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null }),
                }),
            });

            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
                }),
            });

            (supabase.from as jest.Mock).mockImplementation(() => ({
                select: selectMock,
                insert: insertMock,
            }));

            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

            await UserController.createUser(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error creating user' });
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            mockRequest = {
                params: { id: 'user-123' },
                body: {
                    name: 'Updated Name',
                    email: 'updated@example.com',
                    clinicName: 'Updated Clinic',
                },
            };

            const mockUpdatedUser = {
                id: 'user-123',
                name: 'Updated Name',
                email: 'updated@example.com',
                clinic_name: 'Updated Clinic',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: mockUpdatedUser, error: null }),
                        }),
                    }),
                }),
            });

            await UserController.updateUser(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedUser);
        });

        it('should only update provided fields', async () => {
            mockRequest = {
                params: { id: 'user-123' },
                body: {
                    name: 'Updated Name',
                    // email not provided, should not be in update
                },
            };

            const updateMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                update: updateMock,
            });

            await UserController.updateUser(mockRequest as Request, mockResponse as Response);

            expect(updateMock).toHaveBeenCalledWith({
                name: 'Updated Name',
            });
        });

        it('should handle update error', async () => {
            mockRequest = {
                params: { id: 'user-123' },
                body: { name: 'Updated Name' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
                        }),
                    }),
                }),
            });

            await UserController.updateUser(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating user' });
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            mockRequest = {
                params: { id: 'user-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null }),
                }),
            });

            await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith({ message: 'User deleted successfully' });
        });

        it('should handle delete error', async () => {
            mockRequest = {
                params: { id: 'user-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
                }),
            });

            await UserController.deleteUser(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting user' });
        });
    });
});
