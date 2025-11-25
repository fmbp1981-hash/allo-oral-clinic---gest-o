/**
 * Unit tests for Opportunity Controller
 */

import { Request, Response } from 'express';
import {
  getOpportunities,
  createOpportunity,
  searchOpportunities,
  updateOpportunityStatus,
  updateOpportunityNotes,
  deleteOpportunity,
  deleteAllOpportunities,
} from '../src/controllers/opportunity.controller';
import prisma from '../src/lib/prisma';

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
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
    it('should return all opportunities with patient data', async () => {
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

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);

      await getOpportunities(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        include: {
          patient: true,
        },
      });
      expect(jsonMock).toHaveBeenCalledWith(mockOpportunities);
    });

    it('should return 500 on database error', async () => {
      (prisma.opportunity.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await getOpportunities(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error fetching opportunities' });
    });
  });

  describe('createOpportunity', () => {
    it('should create a new opportunity successfully', async () => {
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

      (prisma.opportunity.create as jest.Mock).mockResolvedValue(mockOpportunity);

      await createOpportunity(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: {
          patientId: 'patient-1',
          name: 'John Doe',
          phone: '123456789',
          keywordFound: 'implante',
          status: 'NEW',
        },
      });
      expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        patientId: 'patient-1',
        name: 'John Doe',
        phone: '123456789',
        keywordFound: 'implante',
        status: 'NEW',
      };

      (prisma.opportunity.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await createOpportunity(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error creating opportunity' });
    });
  });

  describe('searchOpportunities', () => {
    it('should search and return matching opportunities', async () => {
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

      (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

      await searchOpportunities(mockRequest as Request, mockResponse as Response);

      expect(prisma.patient.findMany).toHaveBeenCalledWith({
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
    });

    it('should use default limit of 10 when not provided', async () => {
      mockRequest.body = {
        keyword: 'implante',
      };

      (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);

      await searchOpportunities(mockRequest as Request, mockResponse as Response);

      expect(prisma.patient.findMany).toHaveBeenCalledWith({
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
    });

    it('should return 500 on database error', async () => {
      mockRequest.body = {
        keyword: 'implante',
        limit: 10,
      };

      (prisma.patient.findMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await searchOpportunities(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error searching opportunities' });
    });
  });

  describe('updateOpportunityStatus', () => {
    it('should update opportunity status successfully', async () => {
      const mockOpportunity = {
        id: 'opp-1',
        status: 'CONTACTED',
        lastContact: new Date(),
      };

      mockRequest.params = { id: 'opp-1' };
      mockRequest.body = {
        status: 'CONTACTED',
      };

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await updateOpportunityStatus(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: {
          status: 'CONTACTED',
          lastContact: expect.any(Date),
        },
      });
      expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
    });

    it('should update status with scheduled date', async () => {
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

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await updateOpportunityStatus(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: {
          status: 'SCHEDULED',
          lastContact: expect.any(Date),
          scheduledDate: expect.any(Date),
        },
      });
      expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
    });

    it('should return 500 on database error', async () => {
      mockRequest.params = { id: 'opp-1' };
      mockRequest.body = { status: 'CONTACTED' };

      (prisma.opportunity.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await updateOpportunityStatus(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating opportunity status' });
    });
  });

  describe('updateOpportunityNotes', () => {
    it('should update opportunity notes successfully', async () => {
      const mockOpportunity = {
        id: 'opp-1',
        notes: 'Patient is interested in dental implant',
      };

      mockRequest.params = { id: 'opp-1' };
      mockRequest.body = {
        notes: 'Patient is interested in dental implant',
      };

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await updateOpportunityNotes(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: { notes: 'Patient is interested in dental implant' },
      });
      expect(jsonMock).toHaveBeenCalledWith(mockOpportunity);
    });

    it('should return 500 on database error', async () => {
      mockRequest.params = { id: 'opp-1' };
      mockRequest.body = { notes: 'Some notes' };

      (prisma.opportunity.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await updateOpportunityNotes(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error updating opportunity notes' });
    });
  });

  describe('deleteOpportunity', () => {
    it('should delete opportunity successfully', async () => {
      mockRequest.params = { id: 'opp-1' };

      (prisma.opportunity.delete as jest.Mock).mockResolvedValue({ id: 'opp-1' });

      await deleteOpportunity(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.delete).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
      });
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Opportunity deleted successfully',
      });
    });

    it('should return 500 on database error', async () => {
      mockRequest.params = { id: 'opp-1' };

      (prisma.opportunity.delete as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await deleteOpportunity(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting opportunity' });
    });
  });

  describe('deleteAllOpportunities', () => {
    it('should delete all opportunities successfully', async () => {
      (prisma.opportunity.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await deleteAllOpportunities(mockRequest as Request, mockResponse as Response);

      expect(prisma.opportunity.deleteMany).toHaveBeenCalledWith({});
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'All opportunities deleted successfully',
      });
    });

    it('should return 500 on database error', async () => {
      (prisma.opportunity.deleteMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await deleteAllOpportunities(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error deleting all opportunities' });
    });
  });
});
