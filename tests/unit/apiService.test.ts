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

            // Import after mocking
            const { api } = await import('../../services/apiService');
            
            const result = await api.login('test@test.com', 'password123');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should handle login error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: 'Invalid credentials' }),
            });

            const { api } = await import('../../services/apiService');

            await expect(api.login('test@test.com', 'wrong-password')).rejects.toThrow();
        });

        it('should include authorization header in authenticated requests', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const { api } = await import('../../services/apiService');
            await api.getPatients();

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

            const { api } = await import('../../services/apiService');
            const result = await api.getPatients();

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

            const { api } = await import('../../services/apiService');
            const result = await api.createPatient(newPatient);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(newPatient),
                })
            );
            expect(result).toEqual(mockCreatedPatient);
        });

        it('should update a patient', async () => {
            const updateData = { name: 'Updated Name' };
            const mockUpdatedPatient = { id: 'patient-1', ...updateData };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUpdatedPatient),
            });

            const { api } = await import('../../services/apiService');
            const result = await api.updatePatient('patient-1', updateData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients/patient-1'),
                expect.objectContaining({
                    method: 'PUT',
                })
            );
            expect(result).toEqual(mockUpdatedPatient);
        });

        it('should delete a patient', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Deleted successfully' }),
            });

            const { api } = await import('../../services/apiService');
            await api.deletePatient('patient-1');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients/patient-1'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('should search patients', async () => {
            const mockResults = [{ id: 'patient-1', name: 'John Doe' }];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResults),
            });

            const { api } = await import('../../services/apiService');
            const result = await api.searchPatients('john');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/patients/search?query=john'),
                expect.any(Object)
            );
            expect(result).toEqual(mockResults);
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

            const { api } = await import('../../services/apiService');
            const result = await api.getOpportunities();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/opportunities'),
                expect.any(Object)
            );
            expect(result).toEqual(mockOpportunities);
        });

        it('should search opportunities by keyword', async () => {
            const mockResults = [
                { id: 'opp-1', name: 'John Doe', keywordFound: 'implante' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResults),
            });

            const { api } = await import('../../services/apiService');
            const result = await api.searchOpportunities('implante', 20);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/opportunities/search'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ keyword: 'implante', limit: 20 }),
                })
            );
            expect(result).toEqual(mockResults);
        });

        it('should update opportunity status', async () => {
            const mockUpdated = { id: 'opp-1', status: 'SENT' };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUpdated),
            });

            const { api } = await import('../../services/apiService');
            const result = await api.updateOpportunityStatus('opp-1', 'SENT');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/opportunities/opp-1/status'),
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
            expect(result).toEqual(mockUpdated);
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

            const { api } = await import('../../services/apiService');
            const result = await api.getNotifications();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/notifications'),
                expect.any(Object)
            );
            expect(result).toEqual(mockNotifications);
        });

        it('should get unread count', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ count: 5 }),
            });

            const { api } = await import('../../services/apiService');
            const result = await api.getUnreadCount();

            expect(result).toEqual({ count: 5 });
        });

        it('should mark notification as read', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            const { api } = await import('../../services/apiService');
            await api.markAsRead('notif-1');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/notifications/notif-1/read'),
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { api } = await import('../../services/apiService');

            await expect(api.getPatients()).rejects.toThrow('Network error');
        });

        it('should handle 401 errors (unauthorized)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' }),
            });

            const { api } = await import('../../services/apiService');

            await expect(api.getPatients()).rejects.toThrow();
        });

        it('should handle 500 errors (server error)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Internal server error' }),
            });

            const { api } = await import('../../services/apiService');

            await expect(api.getPatients()).rejects.toThrow();
        });
    });
});
