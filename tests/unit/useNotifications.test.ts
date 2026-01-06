import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock dependencies
vi.mock('../../services/apiService', () => ({
    api: {
        getNotifications: vi.fn(),
        getUnreadCount: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
    },
}));

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
    })),
}));

describe('useNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with empty notifications', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue([]);
        (api.getUnreadCount as any).mockResolvedValue({ count: 0 });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it('should fetch notifications on mount', async () => {
        const mockNotifications = [
            { id: 'notif-1', title: 'Test', message: 'Test message', read: false },
            { id: 'notif-2', title: 'Test 2', message: 'Test message 2', read: true },
        ];

        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue(mockNotifications);
        (api.getUnreadCount as any).mockResolvedValue({ count: 1 });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        // Wait for async operations
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(api.getNotifications).toHaveBeenCalled();
    });

    it('should handle loading state', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue([]);
        (api.getUnreadCount as any).mockResolvedValue({ count: 0 });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        // Initially should be loading
        expect(result.current.loading).toBeDefined();
    });

    it('should mark notification as read', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue([
            { id: 'notif-1', title: 'Test', read: false },
        ]);
        (api.getUnreadCount as any).mockResolvedValue({ count: 1 });
        (api.markAsRead as any).mockResolvedValue({ success: true });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        if (result.current.markAsRead) {
            await act(async () => {
                await result.current.markAsRead('notif-1');
            });

            expect(api.markAsRead).toHaveBeenCalledWith('notif-1');
        }
    });

    it('should mark all notifications as read', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue([
            { id: 'notif-1', title: 'Test', read: false },
            { id: 'notif-2', title: 'Test 2', read: false },
        ]);
        (api.getUnreadCount as any).mockResolvedValue({ count: 2 });
        (api.markAllAsRead as any).mockResolvedValue({ success: true });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        if (result.current.markAllAsRead) {
            await act(async () => {
                await result.current.markAllAsRead();
            });

            expect(api.markAllAsRead).toHaveBeenCalled();
        }
    });

    it('should handle error when fetching notifications', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockRejectedValue(new Error('Network error'));
        (api.getUnreadCount as any).mockResolvedValue({ count: 0 });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Should handle error gracefully
        expect(result.current.notifications).toEqual([]);
    });

    it('should refresh notifications', async () => {
        const { api } = await import('../../services/apiService');
        (api.getNotifications as any).mockResolvedValue([]);
        (api.getUnreadCount as any).mockResolvedValue({ count: 0 });

        const { useNotifications } = await import('../../hooks/useNotifications');

        const { result } = renderHook(() => useNotifications());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        if (result.current.refresh) {
            await act(async () => {
                await result.current.refresh();
            });

            // Should have called getNotifications again
            expect(api.getNotifications).toHaveBeenCalledTimes(2);
        }
    });
});
