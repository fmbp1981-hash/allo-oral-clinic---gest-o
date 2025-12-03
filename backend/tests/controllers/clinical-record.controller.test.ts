import { Request, Response } from 'express';
import * as ClinicalRecordController from '../../src/controllers/clinical-record.controller';
import supabase from '../../src/lib/supabase';

// Mock dependencies
jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));

describe('Clinical Record Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockResponse = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe('getClinicalRecords', () => {
        it('should return all clinical records successfully', async () => {
            mockRequest = {
                query: {},
            };

            const mockRecords = [
                {
                    id: 'record-1',
                    date: '2025-11-29',
                    description: 'Initial consultation',
                    type: 'Consultation',
                    patient: { id: 'patient-1', name: 'John Doe' },
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: mockRecords, error: null }),
                }),
            });

            await ClinicalRecordController.getClinicalRecords(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockRecords);
        });

        it('should filter by patient ID when provided', async () => {
            mockRequest = {
                query: { patientId: 'patient-123' },
            };

            const eqMock = jest.fn().mockResolvedValue({ data: [], error: null });

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                        eq: eqMock,
                    }),
                }),
            });

            await ClinicalRecordController.getClinicalRecords(mockRequest as Request, mockResponse as Response);

            expect(eqMock).toHaveBeenCalledWith('patient_id', 'patient-123');
        });

        it('should return empty array when no records', async () => {
            mockRequest = {
                query: {},
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await ClinicalRecordController.getClinicalRecords(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should handle database error', async () => {
            mockRequest = {
                query: {},
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
                }),
            });

            await ClinicalRecordController.getClinicalRecords(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching clinical records' });
        });
    });

    describe('createClinicalRecord', () => {
        it('should create a new clinical record successfully', async () => {
            mockRequest = {
                body: {
                    date: '2025-11-29',
                    description: 'Dental cleaning',
                    type: 'Treatment',
                    patientId: 'patient-123',
                    opportunityId: 'opportunity-456',
                },
            };

            const mockRecord = {
                id: 'new-record-id',
                date: '2025-11-29T00:00:00.000Z',
                description: 'Dental cleaning',
                type: 'Treatment',
                patient_id: 'patient-123',
                opportunity_id: 'opportunity-456',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
                    }),
                }),
            });

            await ClinicalRecordController.createClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockRecord);
        });

        it('should convert date to ISO string', async () => {
            mockRequest = {
                body: {
                    date: '2025-11-29',
                    description: 'Test',
                    type: 'Consultation',
                    patientId: 'patient-123',
                },
            };

            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                insert: insertMock,
            });

            await ClinicalRecordController.createClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            }));
        });

        it('should handle creation error', async () => {
            mockRequest = {
                body: {
                    date: '2025-11-29',
                    description: 'Test',
                    type: 'Consultation',
                    patientId: 'patient-123',
                },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
                    }),
                }),
            });

            await ClinicalRecordController.createClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error creating clinical record' });
        });
    });

    describe('updateClinicalRecord', () => {
        it('should update clinical record successfully', async () => {
            mockRequest = {
                params: { id: 'record-123' },
                body: {
                    description: 'Updated description',
                    type: 'Follow-up',
                },
            };

            const mockUpdatedRecord = {
                id: 'record-123',
                description: 'Updated description',
                type: 'Follow-up',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: mockUpdatedRecord, error: null }),
                        }),
                    }),
                }),
            });

            await ClinicalRecordController.updateClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedRecord);
        });

        it('should only update provided fields', async () => {
            mockRequest = {
                params: { id: 'record-123' },
                body: {
                    description: 'Updated description',
                    // type not provided
                },
            };

            const updateMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                update: updateMock,
            });

            await ClinicalRecordController.updateClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(updateMock).toHaveBeenCalledWith({
                description: 'Updated description',
            });
        });

        it('should convert date to ISO string when updating', async () => {
            mockRequest = {
                params: { id: 'record-123' },
                body: {
                    date: '2025-12-01',
                },
            };

            const updateMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                update: updateMock,
            });

            await ClinicalRecordController.updateClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(updateMock).toHaveBeenCalledWith({
                date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
            });
        });

        it('should handle update error', async () => {
            mockRequest = {
                params: { id: 'record-123' },
                body: { description: 'Updated' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
                        }),
                    }),
                }),
            });

            await ClinicalRecordController.updateClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating clinical record' });
        });
    });

    describe('deleteClinicalRecord', () => {
        it('should delete clinical record successfully', async () => {
            mockRequest = {
                params: { id: 'record-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null }),
                }),
            });

            await ClinicalRecordController.deleteClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith({ message: 'Clinical record deleted' });
        });

        it('should handle delete error', async () => {
            mockRequest = {
                params: { id: 'record-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
                }),
            });

            await ClinicalRecordController.deleteClinicalRecord(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting clinical record' });
        });
    });
});
