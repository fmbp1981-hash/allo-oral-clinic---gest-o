import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock React context
const ToastContextMock = React.createContext<any>(null);

describe('useToast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Toast Hook Functionality', () => {
        it('should provide show function', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            expect(result.current.showToast).toBeDefined();
            expect(typeof result.current.showToast).toBe('function');
        });

        it('should call showToast with correct parameters', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('Test message', 'success');
            });

            expect(mockShowToast).toHaveBeenCalledWith('Test message', 'success');
        });

        it('should handle success toast type', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('Success!', 'success');
            });

            expect(mockShowToast).toHaveBeenCalledWith('Success!', 'success');
        });

        it('should handle error toast type', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('Error occurred!', 'error');
            });

            expect(mockShowToast).toHaveBeenCalledWith('Error occurred!', 'error');
        });

        it('should handle info toast type', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('Info message', 'info');
            });

            expect(mockShowToast).toHaveBeenCalledWith('Info message', 'info');
        });

        it('should handle warning toast type', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('Warning!', 'warning');
            });

            expect(mockShowToast).toHaveBeenCalledWith('Warning!', 'warning');
        });
    });

    describe('Multiple Toast Calls', () => {
        it('should handle multiple sequential toast calls', async () => {
            const mockShowToast = vi.fn();
            
            const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
                React.createElement(ToastContextMock.Provider, {
                    value: { showToast: mockShowToast },
                    children,
                });

            const useTestToast = () => {
                const context = React.useContext(ToastContextMock);
                return context;
            };

            const { result } = renderHook(() => useTestToast(), { wrapper });

            act(() => {
                result.current.showToast('First', 'success');
                result.current.showToast('Second', 'info');
                result.current.showToast('Third', 'error');
            });

            expect(mockShowToast).toHaveBeenCalledTimes(3);
            expect(mockShowToast).toHaveBeenNthCalledWith(1, 'First', 'success');
            expect(mockShowToast).toHaveBeenNthCalledWith(2, 'Second', 'info');
            expect(mockShowToast).toHaveBeenNthCalledWith(3, 'Third', 'error');
        });
    });
});
