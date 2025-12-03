import { Request, Response } from 'express';
import * as PatientController from '../../src/controllers/patient.controller';
import supabase from '../../src/lib/supabase';

// Mock dependencies
jest.mock('../../src/lib/supabase', () => ({
    from: jest.fn(),
}));

describe('Patient Controller', () => {
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

    describe('getPatients', () => {
        it('should return all patients successfully', async () => {
            mockRequest = {};

            const mockPatients = [
                {
                    id: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    email: 'john@example.com',
                    clinical_records: [],
                    opportunities: [],
                },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: mockPatients, error: null }),
                }),
            });

            await PatientController.getPatients(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockPatients);
        });

        it('should return empty array when no patients', async () => {
            mockRequest = {};

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            });

            await PatientController.getPatients(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith([]);
        });

        it('should handle database error', async () => {
            mockRequest = {};

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
                }),
            });

            await PatientController.getPatients(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching patients' });
        });
    });

    describe('createPatient', () => {
        it('should create a new patient successfully', async () => {
            mockRequest = {
                body: {
                    name: 'Jane Doe',
                    phone: '987654321',
                    email: 'jane@example.com',
                    history: 'Patient history',
                },
            };

            const mockPatient = {
                id: 'new-patient-id',
                name: 'Jane Doe',
                phone: '987654321',
                email: 'jane@example.com',
                history: 'Patient history',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
                    }),
                }),
            });

            await PatientController.createPatient(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockPatient);
        });

        it('should create patient with empty history if not provided', async () => {
            mockRequest = {
                body: {
                    name: 'Jane Doe',
                    phone: '987654321',
                    email: 'jane@example.com',
                },
            };

            const insertMock = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
                }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
                insert: insertMock,
            });

            await PatientController.createPatient(mockRequest as Request, mockResponse as Response);

            expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
                history: '',
            }));
        });

        it('should handle creation error', async () => {
            mockRequest = {
                body: {
                    name: 'Jane Doe',
                    phone: '987654321',
                },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
                    }),
                }),
            });

            await PatientController.createPatient(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error creating patient' });
        });
    });

    describe('getPatientById', () => {
        it('should return patient by ID successfully', async () => {
            mockRequest = {
                params: { id: 'patient-123' },
            };

            const mockPatient = {
                id: 'patient-123',
                name: 'John Doe',
                phone: '123456789',
                clinical_records: [],
                opportunities: [],
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: mockPatient, error: null }),
                    }),
                }),
            });

            await PatientController.getPatientById(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockPatient);
        });

        it('should return 404 when patient not found', async () => {
            mockRequest = {
                params: { id: 'non-existent' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                    }),
                }),
            });

            await PatientController.getPatientById(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Patient not found' });
        });
    });

    describe('updatePatient', () => {
        it('should update patient successfully', async () => {
            mockRequest = {
                params: { id: 'patient-123' },
                body: {
                    name: 'Updated Name',
                    phone: '111222333',
                },
            };

            const mockUpdatedPatient = {
                id: 'patient-123',
                name: 'Updated Name',
                phone: '111222333',
            };

            (supabase.from as jest.Mock).mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: mockUpdatedPatient, error: null }),
                        }),
                    }),
                }),
            });

            await PatientController.updatePatient(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockUpdatedPatient);
        });

        it('should handle update error', async () => {
            mockRequest = {
                params: { id: 'patient-123' },
                body: { name: 'Updated Name' },
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

            await PatientController.updatePatient(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating patient' });
        });
    });

    describe('deletePatient', () => {
        it('should delete patient successfully', async () => {
            mockRequest = {
                params: { id: 'patient-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null }),
                }),
            });

            await PatientController.deletePatient(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith({ message: 'Patient deleted successfully' });
        });

        it('should handle delete error', async () => {
            mockRequest = {
                params: { id: 'patient-123' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
                }),
            });

            await PatientController.deletePatient(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting patient' });
        });
    });

    describe('searchPatients', () => {
        it('should search patients successfully', async () => {
            mockRequest = {
                query: { query: 'John' },
            };

            const mockResults = [
                { id: 'patient-1', name: 'John Doe' },
                { id: 'patient-2', name: 'Johnny Smith' },
            ];

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
                        }),
                    }),
                }),
            });

            await PatientController.searchPatients(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith(mockResults);
        });

        it('should return 400 if query is missing', async () => {
            mockRequest = {
                query: {},
            };

            await PatientController.searchPatients(mockRequest as Request, mockResponse as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Search query is required' });
        });

        it('should return empty array when no results', async () => {
            mockRequest = {
                query: { query: 'NonExistent' },
            };

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    or: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                    }),
                }),
            });

            await PatientController.searchPatients(mockRequest as Request, mockResponse as Response);

            expect(jsonMock).toHaveBeenCalledWith([]);
        });
    });
});
