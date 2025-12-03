"use strict";
/**
 * Unit tests for Opportunity Controller
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const opportunity_controller_1 = require("../src/controllers/opportunity.controller");
const prisma_1 = require("../src/lib/prisma");
// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
    __esModule: true,
    default: {
        opportunity: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        patient: {
            findMany: jest.fn(),
        },
    },
}));
describe('Opportunity Controller', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            body: {},
            params: {},
        };
        mockResponse = {
            json: jsonMock,
            status: statusMock,
        };
        jest.clearAllMocks();
    });
    describe('getOpportunities', () => {
        it('should return all opportunities with patient data', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOpportunities = [
                {
                    id: 'opp-1',
                    patientId: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    keywordFound: 'implante',
                    status: 'NEW',
                    patient: {
                        id: 'patient-1',
                        name: 'John Doe',
                        phone: '123456789',
                    },
                },
                {
                    id: 'opp-2',
                    patientId: 'patient-2',
                    name: 'Jane Smith',
                    phone: '987654321',
                    keywordFound: 'clareamento',
                    status: 'CONTACTED',
                    patient: {
                        id: 'patient-2',
                        name: 'Jane Smith',
                        phone: '987654321',
                    },
                },
            ];
            prisma_1.default.opportunity.findMany.mockResolvedValue(mockOpportunities);
            yield (0, opportunity_controller_1.getOpportunities)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.findMany).toHaveBeenCalledWith({
                include: {
                    patient: true,
                },
            });
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunities);
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            prisma_1.default.opportunity.findMany.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.getOpportunities)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching opportunities' });
        }));
    });
    describe('createOpportunity', () => {
        it('should create a new opportunity successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOpportunity = {
                id: 'opp-1',
                patientId: 'patient-1',
                name: 'John Doe',
                phone: '123456789',
                keywordFound: 'implante',
                status: 'NEW',
            };
            mockRequest.body = {
                patientId: 'patient-1',
                name: 'John Doe',
                phone: '123456789',
                keywordFound: 'implante',
                status: 'NEW',
            };
            prisma_1.default.opportunity.create.mockResolvedValue(mockOpportunity);
            yield (0, opportunity_controller_1.createOpportunity)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.create).toHaveBeenCalledWith({
                data: {
                    patientId: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    keywordFound: 'implante',
                    status: 'NEW',
                },
            });
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                patientId: 'patient-1',
                name: 'John Doe',
                phone: '123456789',
                keywordFound: 'implante',
                status: 'NEW',
            };
            prisma_1.default.opportunity.create.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.createOpportunity)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error creating opportunity' });
        }));
    });
    describe('searchOpportunities', () => {
        it('should search and return matching opportunities', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockPatients = [
                {
                    id: 'patient-1',
                    name: 'John Doe',
                    phone: '123456789',
                    history: 'Paciente interessado em implante dentário',
                    clinicalRecords: [
                        {
                            id: 'record-1',
                            description: 'Primeira consulta',
                        },
                    ],
                },
                {
                    id: 'patient-2',
                    name: 'Jane Smith',
                    phone: '987654321',
                    history: 'Paciente quer fazer implante',
                    clinicalRecords: [],
                },
            ];
            mockRequest.body = {
                keyword: 'implante',
                limit: 10,
            };
            prisma_1.default.patient.findMany.mockResolvedValue(mockPatients);
            yield (0, opportunity_controller_1.searchOpportunities)(mockRequest, mockResponse);
            expect(prisma_1.default.patient.findMany).toHaveBeenCalledWith({
                where: {
                    history: {
                        contains: 'implante',
                    },
                },
                take: 10,
                include: {
                    clinicalRecords: true,
                },
            });
            expect(jsonMock).toHaveBeenCalled();
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveLength(2);
            expect(response[0]).toMatchObject({
                patientId: 'patient-1',
                name: 'John Doe',
                phone: '123456789',
                keywordFound: 'implante',
                status: 'NEW',
            });
        }));
        it('should use default limit of 10 when not provided', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                keyword: 'implante',
            };
            prisma_1.default.patient.findMany.mockResolvedValue([]);
            yield (0, opportunity_controller_1.searchOpportunities)(mockRequest, mockResponse);
            expect(prisma_1.default.patient.findMany).toHaveBeenCalledWith({
                where: {
                    history: {
                        contains: 'implante',
                    },
                },
                take: 10,
                include: {
                    clinicalRecords: true,
                },
            });
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {
                keyword: 'implante',
                limit: 10,
            };
            prisma_1.default.patient.findMany.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.searchOpportunities)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error searching opportunities' });
        }));
    });
    describe('updateOpportunityStatus', () => {
        it('should update opportunity status successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOpportunity = {
                id: 'opp-1',
                status: 'CONTACTED',
                lastContact: new Date(),
            };
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                status: 'CONTACTED',
            };
            prisma_1.default.opportunity.update.mockResolvedValue(mockOpportunity);
            yield (0, opportunity_controller_1.updateOpportunityStatus)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.update).toHaveBeenCalledWith({
                where: { id: 'opp-1' },
                data: {
                    status: 'CONTACTED',
                    lastContact: expect.any(Date),
                },
            });
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
        }));
        it('should update status with scheduled date', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOpportunity = {
                id: 'opp-1',
                status: 'SCHEDULED',
                lastContact: new Date(),
                scheduledDate: new Date('2025-12-01'),
            };
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                status: 'SCHEDULED',
                scheduledDate: '2025-12-01',
            };
            prisma_1.default.opportunity.update.mockResolvedValue(mockOpportunity);
            yield (0, opportunity_controller_1.updateOpportunityStatus)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.update).toHaveBeenCalledWith({
                where: { id: 'opp-1' },
                data: {
                    status: 'SCHEDULED',
                    lastContact: expect.any(Date),
                    scheduledDate: expect.any(Date),
                },
            });
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = { status: 'CONTACTED' };
            prisma_1.default.opportunity.update.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.updateOpportunityStatus)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating opportunity status' });
        }));
    });
    describe('updateOpportunityNotes', () => {
        it('should update opportunity notes successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockOpportunity = {
                id: 'opp-1',
                notes: 'Patient is interested in dental implant',
            };
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = {
                notes: 'Patient is interested in dental implant',
            };
            prisma_1.default.opportunity.update.mockResolvedValue(mockOpportunity);
            yield (0, opportunity_controller_1.updateOpportunityNotes)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.update).toHaveBeenCalledWith({
                where: { id: 'opp-1' },
                data: { notes: 'Patient is interested in dental implant' },
            });
            expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.params = { id: 'opp-1' };
            mockRequest.body = { notes: 'Some notes' };
            prisma_1.default.opportunity.update.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.updateOpportunityNotes)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating opportunity notes' });
        }));
    });
    describe('deleteOpportunity', () => {
        it('should delete opportunity successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.params = { id: 'opp-1' };
            prisma_1.default.opportunity.delete.mockResolvedValue({ id: 'opp-1' });
            yield (0, opportunity_controller_1.deleteOpportunity)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.delete).toHaveBeenCalledWith({
                where: { id: 'opp-1' },
            });
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Opportunity deleted successfully',
            });
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.params = { id: 'opp-1' };
            prisma_1.default.opportunity.delete.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.deleteOpportunity)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting opportunity' });
        }));
    });
    describe('deleteAllOpportunities', () => {
        it('should delete all opportunities successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            prisma_1.default.opportunity.deleteMany.mockResolvedValue({ count: 5 });
            yield (0, opportunity_controller_1.deleteAllOpportunities)(mockRequest, mockResponse);
            expect(prisma_1.default.opportunity.deleteMany).toHaveBeenCalledWith({});
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'All opportunities deleted successfully',
            });
        }));
        it('should return 500 on database error', () => __awaiter(void 0, void 0, void 0, function* () {
            prisma_1.default.opportunity.deleteMany.mockRejectedValue(new Error('DB Error'));
            yield (0, opportunity_controller_1.deleteAllOpportunities)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting all opportunities' });
        }));
    });
});
