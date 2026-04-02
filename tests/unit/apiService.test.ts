import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('apiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        localStorageMock.getItem.mockReturnValue('test-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Authentication', () => {
        it('should login successfully', async () => {
            const mockResponse = {
                user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const { loginUser } = await import('../../services/apiService');
            const result = await loginUser('test@test.com', 'password123');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
            expect(result).toBeDefined();
        });

        it('should handle login error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: 'Invalid credentials' }),
            });

            const { loginUser } = await import('../../services/apiService');

            await expect(loginUser('test@test.com', 'wrong-password')).rejects.toThrow();
        });

        it('should include authorization header in authenticated requests', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const { getAllPatients } = await import('../../services/apiService');
            await getAllPatients();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token',
                    }),
                })
            );
        });
    });

    describe('Patients', () => {
        it('should fetch all patients', async () => {
            const mockPatients = [
                { id: 'patient-1', name: 'John Doe', phone: '123456789' },
                { id: 'patient-2', name: 'Jane Doe', phone: '987654321' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPatients),
            });

            const { getAllPatients } = await import('../../services/apiService');
            const result = await getAllPatients();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients'),
                expect.any(Object)
            );
            expect(result).toEqual(mockPatients);
        });

        it('should create a new patient', async () => {
            const newPatient = {
                name: 'New Patient',
                phone: '111222333',
                email: 'new@patient.com',
                history: 'First visit',
            };

            const mockCreatedPatient = { id: 'new-patient-id', ...newPatient };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCreatedPatient),
            });

            const { createPatient } = await import('../../services/apiService');
            const result = await createPatient(newPatient);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
            expect(result).toEqual(mockCreatedPatient);
        });
    });

    describe('Opportunities', () => {
        it('should fetch all opportunities', async () => {
            const mockOpportunities = [
                { id: 'opp-1', name: 'John Doe', status: 'NEW' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockOpportunities),
            });

            const { getAllOpportunities } = await import('../../services/apiService');
            const result = await getAllOpportunities();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/opportunities'),
                expect.any(Object)
            );
            expect(result).toEqual(mockOpportunities);
        });

        it('should update opportunity status', async () => {
            const mockUpdated = { id: 'opp-1', status: 'SENT' };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUpdated),
            });

            const { updateOpportunityStatus } = await import('../../services/apiService');
            await updateOpportunityStatus('opp-1', 'SENT' as any);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/opportunities/opp-1/status'),
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
        });
    });

    describe('Notifications', () => {
        it('should fetch notifications', async () => {
            const mockNotifications = [
                { id: 'notif-1', title: 'Test', read: false },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockNotifications),
            });

            const { getMockNotifications } = await import('../../services/apiService');
            const result = await getMockNotifications();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/notifications'),
                expect.any(Object)
            );
            expect(result).toEqual(mockNotifications);
        });

        it('should mark notification as read', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const { markNotificationAsRead } = await import('../../services/apiService');
            await markNotificationAsRead('notif-1');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/notifications/notif-1'),
                expect.objectContaining({
                    method: 'PUT',
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { getAllPatients } = await import('../../services/apiService');

            await expect(getAllPatients()).rejects.toThrow();
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Internal server error' }),
            });

            const { getAllPatients } = await import('../../services/apiService');

            await expect(getAllPatients()).rejects.toThrow();
        });
    });
});
