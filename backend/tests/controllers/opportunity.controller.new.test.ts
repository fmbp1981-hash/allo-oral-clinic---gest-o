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

import * as OpportunityController from '../../src/controllers/opportunity.controller';

describe('Opportunity Controller', () => {
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

    describe('getOpportunities', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await OpportunityController.getOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should return 401 when tenantId is missing', async () => {
            mockRequest.user = { userId: 'test-user-id', tenantId: '' };

            await OpportunityController.getOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('should return all opportunities for the tenant', async () => {
            const mockOpportunities = [
                {
                    id: 'opp-1',
                    patient_id: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    keyword_found: 'implante',
                    status: 'NEW',
                    tenant_id: mockUser.tenantId,
                    patient: {
                        id: 'patient-1',
                        name: 'John Doe',
                    },
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: mockOpportunities,
                            error: null,
                        }),
                    }),
                }),
            });

            await OpportunityController.getOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(supabase.from).toHaveBeenCalledWith('opportunities');
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunities);
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

            await OpportunityController.getOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching opportunities' });
        });
    });

    describe('createOpportunity', () => {
        it('should create a new opportunity', async () => {
            mockRequest.body = {
                patientId: 'patient-1',
                name: 'Jane Doe',
                phone: '987654321',
                keywordFound: 'ortodontia',
                status: 'NEW',
            };

            const mockCreatedOpportunity = {
                id: 'new-opp-id',
                patient_id: mockRequest.body.patientId,
                name: mockRequest.body.name,
                phone: mockRequest.body.phone,
                keyword_found: mockRequest.body.keywordFound,
                status: mockRequest.body.status,
                user_id: mockUser.userId,
                tenant_id: mockUser.tenantId,
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockCreatedOpportunity,
                            error: null,
                        }),
                    }),
                }),
            });

            await OpportunityController.createOpportunity(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockCreatedOpportunity);
        });

        it('should default status to NEW when not provided', async () => {
            mockRequest.body = {
                patientId: 'patient-1',
                name: 'Jane Doe',
                phone: '987654321',
                keywordFound: 'ortodontia',
            };

            const mockCreatedOpportunity = {
                id: 'new-opp-id',
                status: 'NEW', // default
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockCreatedOpportunity,
                            error: null,
                        }),
                    }),
                }),
            });

            await OpportunityController.createOpportunity(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockCreatedOpportunity);
        });
    });

    describe('searchOpportunities', () => {
        it('should search patients by keyword in history', async () => {
            mockRequest.body = {
                keyword: 'implante',
                limit: 10,
            };

            const mockPatients = [
                {
                    id: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    history: 'Consulta para implante dentário',
                    clinical_records: [],
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        ilike: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue({
                                data: mockPatients,
                                error: null,
                            }),
                        }),
                    }),
                }),
            });

            await OpportunityController.searchOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(supabase.from).toHaveBeenCalledWith('patients');
            expect(jsonMock).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        patientId: 'patient-1',
                        name: 'John Doe',
                        keywordFound: 'implante',
                        status: 'NEW',
                    }),
                ])
            );
        });
    });

    describe('updateOpportunityStatus', () => {
        it('should update opportunity status', async () => {
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                status: 'SENT',
            };

            const mockUpdatedOpportunity = {
                id: 'opp-1',
                status: 'SENT',
                last_contact: expect.any(String),
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: mockUpdatedOpportunity,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            });

            await OpportunityController.updateOpportunityStatus(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedOpportunity);
        });

        it('should update scheduled date when status is SCHEDULED', async () => {
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                status: 'SCHEDULED',
                scheduledDate: '2026-01-10T14:00:00.000Z',
            };

            const mockUpdatedOpportunity = {
                id: 'opp-1',
                status: 'SCHEDULED',
                scheduled_date: '2026-01-10T14:00:00.000Z',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: mockUpdatedOpportunity,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            });

            await OpportunityController.updateOpportunityStatus(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedOpportunity);
        });
    });

    describe('updateOpportunityNotes', () => {
        it('should update opportunity notes', async () => {
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                notes: 'Patient interested in scheduling next week',
            };

            const mockUpdatedOpportunity = {
                id: 'opp-1',
                notes: mockRequest.body.notes,
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: mockUpdatedOpportunity,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }),
            });

            await OpportunityController.updateOpportunityNotes(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedOpportunity);
        });
    });

    describe('deleteOpportunity', () => {
        it('should delete an opportunity', async () => {
            mockRequest.params = { id: 'opp-1' };

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

            await OpportunityController.deleteOpportunity(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith({ message: 'Opportunity deleted successfully' });
        });

        it('should handle delete errors', async () => {
            mockRequest.params = { id: 'opp-1' };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Delete failed' },
                        }),
                    }),
                }),
            });

            await OpportunityController.deleteOpportunity(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting opportunity' });
        });
    });

    describe('deleteAllOpportunities', () => {
        it('should delete all opportunities for the tenant', async () => {
            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                    }),
                }),
            });

            await OpportunityController.deleteAllOpportunities(
                mockRequest as AuthRequest,
                mockResponse as Response
            );

            expect(jsonMock).toHaveBeenCalledWith({ message: 'All opportunities deleted successfully' });
        });
    });
});
