import { Response } from 'express';
import { AuthRequest } from '../../src/middlewares/auth.middleware';
import supabase from '../../src/lib/supabase';

// Mock dependencies
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

import * as SettingsController from '../../src/controllers/settings.controller';

describe('Settings Controller', () => {
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

    describe('getSettings', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await SettingsController.getSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return settings for the user', async () => {
            const mockSettings = {
                id: 'settings-1',
                user_id: mockUser.userId,
                tenant_id: mockUser.tenantId,
                webhook_url: 'https://n8n.example.com/webhook',
                messaging_webhook_url: 'https://n8n.example.com/whatsapp',
                api_key: 'sk_live_xxx',
                message_template: 'Hello {name}!',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockSettings,
                            error: null,
                        }),
                    }),
                }),
            });

            await SettingsController.getSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(supabase.from).toHaveBeenCalledWith('app_settings');
            expect(jsonMock).toHaveBeenCalledWith(mockSettings);
        });

        it('should return default settings when none exist', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'PGRST116', message: 'Not found' },
                        }),
                    }),
                }),
            });

            await SettingsController.getSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            // Should return empty/default settings object
            expect(jsonMock).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Database connection error' },
                        }),
                    }),
                }),
            });

            await SettingsController.getSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('updateSettings', () => {
        it('should update settings successfully', async () => {
            mockRequest.body = {
                webhookUrl: 'https://new-webhook.com',
                messagingWebhookUrl: 'https://new-whatsapp-webhook.com',
                messageTemplate: 'New template {name}',
            };

            const mockUpdatedSettings = {
                id: 'settings-1',
                user_id: mockUser.userId,
                tenant_id: mockUser.tenantId,
                webhook_url: mockRequest.body.webhookUrl,
                messaging_webhook_url: mockRequest.body.messagingWebhookUrl,
                message_template: mockRequest.body.messageTemplate,
            };

            // Mock upsert for settings
            (supabase.from as jest.Mock).mockReturnValue({
                upsert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockUpdatedSettings,
                            error: null,
                        }),
                    }),
                }),
            });

            await SettingsController.updateSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedSettings);
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await SettingsController.updateSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should handle update errors', async () => {
            mockRequest.body = {
                webhookUrl: 'https://new-webhook.com',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                upsert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Update failed' },
                        }),
                    }),
                }),
            });

            await SettingsController.updateSettings(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
