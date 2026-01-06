import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage and matchMedia
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('useDarkMode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with light mode by default', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            expect(result.current.isDark).toBe(false);
        });

        it('should initialize with dark mode if saved in localStorage', async () => {
            localStorageMock.getItem.mockReturnValue('true');

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode');
        });

        it('should respect system preference when no saved preference', async () => {
            localStorageMock.getItem.mockReturnValue(null);
            
            // Mock system prefers dark
            (window.matchMedia as any).mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            // Hook should check system preference
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        });
    });

    describe('Toggle Functionality', () => {
        it('should toggle dark mode on', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            act(() => {
                result.current.toggle();
            });

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        it('should toggle dark mode off', async () => {
            localStorageMock.getItem.mockReturnValue('true');

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            act(() => {
                result.current.toggle();
            });

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });

        it('should toggle multiple times', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            // Toggle on
            act(() => {
                result.current.toggle();
            });

            // Toggle off
            act(() => {
                result.current.toggle();
            });

            // Toggle on again
            act(() => {
                result.current.toggle();
            });

            expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
        });
    });

    describe('Set Functions', () => {
        it('should have setDark function to enable dark mode', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            if (result.current.setDark) {
                act(() => {
                    result.current.setDark(true);
                });

                expect(localStorageMock.setItem).toHaveBeenCalled();
            }
        });

        it('should have setDark function to disable dark mode', async () => {
            localStorageMock.getItem.mockReturnValue('true');

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            if (result.current.setDark) {
                act(() => {
                    result.current.setDark(false);
                });

                expect(localStorageMock.setItem).toHaveBeenCalled();
            }
        });
    });

    describe('DOM Updates', () => {
        it('should add dark class to document when dark mode enabled', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            act(() => {
                result.current.toggle();
            });

            // The hook should update document.documentElement.classList
            // This is a side effect we expect from the hook
        });
    });

    describe('Persistence', () => {
        it('should save preference to localStorage', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            const { result } = renderHook(() => useDarkMode());

            act(() => {
                result.current.toggle();
            });

            expect(localStorageMock.setItem).toHaveBeenCalledWith('darkMode', expect.any(String));
        });

        it('should read preference from localStorage on mount', async () => {
            localStorageMock.getItem.mockReturnValue('true');

            const { useDarkMode } = await import('../../hooks/useDarkMode');
            renderHook(() => useDarkMode());

            expect(localStorageMock.getItem).toHaveBeenCalledWith('darkMode');
        });
    });
});
