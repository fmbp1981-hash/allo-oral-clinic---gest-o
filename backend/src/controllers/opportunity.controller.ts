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
