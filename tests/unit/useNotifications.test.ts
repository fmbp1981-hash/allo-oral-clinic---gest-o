import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock Socket.IO
const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
};

vi.mock('socket.io-client', () => ({
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket),
}));

// Mock useToast
vi.mock('../../hooks/useToast', () => ({
    useToast: () => ({
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    }),
}));

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should throw when used outside of NotificationsProvider', async () => {
        const { useNotifications } = await import('../../hooks/useNotifications');

        expect(() => {
            renderHook(() => useNotifications());
        }).toThrow('useNotifications must be used within a NotificationsProvider');
    });

    it('should provide notifications context when wrapped in provider', async () => {
        const { useNotifications, NotificationsProvider } = await import('../../hooks/useNotifications');

        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
            React.createElement(NotificationsProvider, { userId: 'test-user', tenantId: 'test-tenant' }, children);

        const { result } = renderHook(() => useNotifications(), { wrapper });

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
        expect(typeof result.current.markAsRead).toBe('function');
    });

    it('should initialize Socket.IO connection with userId', async () => {
        const { io } = await import('socket.io-client');
        const { NotificationsProvider, useNotifications } = await import('../../hooks/useNotifications');

        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
            React.createElement(NotificationsProvider, { userId: 'user-123', tenantId: 'tenant-1' }, children);

        renderHook(() => useNotifications(), { wrapper });

        // Socket.IO should have been initialized
        expect(io).toHaveBeenCalled();
    });

    it('should register socket event listeners', async () => {
        const { NotificationsProvider, useNotifications } = await import('../../hooks/useNotifications');

        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
            React.createElement(NotificationsProvider, { userId: 'user-123', tenantId: 'tenant-1' }, children);

        renderHook(() => useNotifications(), { wrapper });

        // Should register event handlers
        const eventNames = mockSocket.on.mock.calls.map((call: unknown[]) => call[0]);
        expect(eventNames).toContain('connect');
        expect(eventNames).toContain('disconnect');
        expect(eventNames).toContain('new_notification');
        expect(eventNames).toContain('unread_notifications');
    });
});
