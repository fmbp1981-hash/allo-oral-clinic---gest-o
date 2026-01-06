import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock timer functions
vi.useFakeTimers();

describe('useDebounce', () => {
    afterEach(() => {
        vi.clearAllTimers();
    });

    it('should return initial value immediately', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const { result } = renderHook(() => useDebounce('initial', 500));
        
        expect(result.current).toBe('initial');
    });

    it('should debounce value changes', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        // Change value
        rerender({ value: 'changed', delay: 500 });
        
        // Value should not change immediately
        expect(result.current).toBe('initial');

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Now value should be updated
        expect(result.current).toBe('changed');
    });

    it('should reset timer on rapid value changes', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        // Multiple rapid changes
        rerender({ value: 'change1', delay: 500 });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'change2', delay: 500 });
        act(() => {
            vi.advanceTimersByTime(200);
        });

        rerender({ value: 'change3', delay: 500 });
        
        // Still should be initial
        expect(result.current).toBe('initial');

        // Fast-forward remaining time
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Should be the last value
        expect(result.current).toBe('change3');
    });

    it('should handle different delay values', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 1000 } }
        );

        rerender({ value: 'changed', delay: 1000 });
        
        act(() => {
            vi.advanceTimersByTime(500);
        });
        
        // Not yet - delay is 1000ms
        expect(result.current).toBe('initial');
        
        act(() => {
            vi.advanceTimersByTime(500);
        });
        
        // Now it should update
        expect(result.current).toBe('changed');
    });

    it('should handle object values', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const initialObj = { name: 'John', age: 30 };
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: initialObj, delay: 500 } }
        );

        expect(result.current).toEqual(initialObj);

        const newObj = { name: 'Jane', age: 25 };
        rerender({ value: newObj, delay: 500 });

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toEqual(newObj);
    });

    it('should cleanup timer on unmount', async () => {
        const { useDebounce } = await import('../../hooks/useDebounce');
        
        const { result, unmount, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        );

        rerender({ value: 'changed', delay: 500 });
        
        // Unmount before timer fires
        unmount();

        // Should not cause any issues
        act(() => {
            vi.advanceTimersByTime(500);
        });
    });
});
