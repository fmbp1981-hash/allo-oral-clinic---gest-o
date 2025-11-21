import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getClinicalRecords = async (req: Request, res: Response) => {
    try {
        const { patientId } = req.query;
        const where = patientId ? { patientId: String(patientId) } : {};

        const records = await prisma.clinicalRecord.findMany({
            where,
            include: {
                patient: true,
                opportunity: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching clinical records' });
    }
};

export const createClinicalRecord = async (req: Request, res: Response) => {
    try {
        const { date, description, type, patientId, opportunityId } = req.body;
        const record = await prisma.clinicalRecord.create({
            data: {
                date: new Date(date),
                description,
                type,
                patientId,
                opportunityId,
            },
        });
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: 'Error creating clinical record' });
    }
};

export const updateClinicalRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, description, type } = req.body;
        const record = await prisma.clinicalRecord.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                description,
                type,
            },
        });
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: 'Error updating clinical record' });
    }
};

export const deleteClinicalRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.clinicalRecord.delete({
            where: { id },
        });
        res.json({ message: 'Clinical record deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting clinical record' });
    }
};
