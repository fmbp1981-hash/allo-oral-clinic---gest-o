import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getOpportunities = async (req: Request, res: Response) => {
    try {
        const opportunities = await prisma.opportunity.findMany({
            include: {
                patient: true,
            },
        });
        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching opportunities' });
    }
};

export const createOpportunity = async (req: Request, res: Response) => {
    try {
        const { patientId, name, phone, keywordFound, status } = req.body;
        const opportunity = await prisma.opportunity.create({
            data: {
                patientId,
                name,
                phone,
                keywordFound,
                status,
            },
        });
        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ error: 'Error creating opportunity' });
    }
};

export const searchOpportunities = async (req: Request, res: Response) => {
    try {
        const { keyword, limit = 10 } = req.body;

        // Search patients that match the keyword in their history
        const patients = await prisma.patient.findMany({
            where: {
                history: {
                    contains: keyword.toLowerCase(),
                },
            },
            take: parseInt(limit as string),
            include: {
                clinicalRecords: true,
            },
        });

        // Create opportunities from found patients
        const opportunities = patients.map(patient => ({
            id: `opp_${Date.now()}_${patient.id}`,
            patientId: patient.id,
            name: patient.name,
            phone: patient.phone,
            keywordFound: keyword,
            status: 'NEW',
            createdAt: new Date().toISOString(),
            clinicalRecords: patient.clinicalRecords,
        }));

        res.json(opportunities);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Error searching opportunities' });
    }
};

export const updateOpportunityStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, scheduledDate } = req.body;

        const opportunity = await prisma.opportunity.update({
            where: { id },
            data: {
                status,
                lastContact: new Date(),
                ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
            },
        });

        res.json(opportunity);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Error updating opportunity status' });
    }
};

export const updateOpportunityNotes = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const opportunity = await prisma.opportunity.update({
            where: { id },
            data: { notes },
        });

        res.json(opportunity);
    } catch (error) {
        console.error('Update notes error:', error);
        res.status(500).json({ error: 'Error updating opportunity notes' });
    }
};

export const deleteOpportunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.opportunity.delete({
            where: { id },
        });

        res.json({ message: 'Opportunity deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Error deleting opportunity' });
    }
};

export const deleteAllOpportunities = async (req: Request, res: Response) => {
    try {
        await prisma.opportunity.deleteMany({});

        res.json({ message: 'All opportunities deleted successfully' });
    } catch (error) {
        console.error('Delete all error:', error);
        res.status(500).json({ error: 'Error deleting all opportunities' });
    }
};
