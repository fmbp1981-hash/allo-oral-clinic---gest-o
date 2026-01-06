import { Response } from 'express';
import { AuthRequest } from '../../src/middlewares/auth.middleware';
import supabase from '../../src/lib/supabase';

// Import after mocking
jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));

jest.mock('../../src/lib/logger', () => ({
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

// Mock notification service
jest.mock('../../src/services/notification.service', () => ({
    notify: jest.fn(),
    getConnectedUsersCount: jest.fn().mockReturnValue(0),
}));

import * as NotificationController from '../../src/controllers/notification.controller';

describe('Notification Controller', () => {
    let mockRequest: Partial<AuthRequest>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    const mockUser = {
        userId: 'test-user-id',
        tenantId: 'test-tenant-id',
    };

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        mockRequest = {
            user: mockUser,
            params: {},
            query: {},
            body: {},
        };
        jest.clearAllMocks();
    });

    describe('getNotifications', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await NotificationController.getNotifications(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return all notifications for the user', async () => {
            const mockNotifications = [
                {
                    id: 'notif-1',
                    user_id: mockUser.userId,
                    tenant_id: mockUser.tenantId,
                    title: 'Test Notification',
                    message: 'This is a test',
                    type: 'info',
                    read: false,
                    created_at: '2026-01-05T10:00:00.000Z',
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: mockNotifications,
                            error: null,
                        }),
                    }),
                }),
            });

            await NotificationController.getNotifications(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(supabase.from).toHaveBeenCalledWith('notifications');
            expect(jsonMock).toHaveBeenCalledWith(mockNotifications);
        });

        it('should handle database errors', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Database error' },
                        }),
                    }),
                }),
            });

            await NotificationController.getNotifications(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching notifications' });
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count', async () => {
            const mockNotifications = [
                { id: 'notif-1', read: false },
                { id: 'notif-2', read: false },
                { id: 'notif-3', read: false },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: mockNotifications,
                            error: null,
                        }),
                    }),
                }),
            });

            await NotificationController.getUnreadCount(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith({ count: 3 });
        });
    });

    describe('createNotification', () => {
        it('should create a new notification', async () => {
            mockRequest.body = {
                title: 'New Notification',
                message: 'This is a new notification',
                type: 'success',
            };

            const mockCreatedNotification = {
                id: 'new-notif-id',
                user_id: mockUser.userId,
                tenant_id: mockUser.tenantId,
                ...mockRequest.body,
                read: false,
                created_at: '2026-01-05T10:00:00.000Z',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockCreatedNotification,
                            error: null,
                        }),
                    }),
                }),
            });

            await NotificationController.createNotification(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockCreatedNotification);
        });

        it('should return 400 when title is missing', async () => {
            mockRequest.body = {
                message: 'No title provided',
            };

            await NotificationController.createNotification(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Title and message are required' });
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockRequest.params = { id: 'notif-1' };

            const mockUpdatedNotification = {
                id: 'notif-1',
                read: true,
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: mockUpdatedNotification,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            });

            await NotificationController.markAsRead(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedNotification);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    }),
                }),
            });

            await NotificationController.markAllAsRead(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith({ message: 'All notifications marked as read' });
        });
    });

    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            mockRequest.params = { id: 'notif-1' };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    }),
                }),
            });

            await NotificationController.deleteNotification(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
        });
    });
});
