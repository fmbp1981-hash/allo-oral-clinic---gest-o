import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getPatients = async (req: Request, res: Response) => {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                clinicalRecords: true,
                opportunities: true,
            },
        });
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching patients' });
    }
};

export const createPatient = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, history } = req.body;
        const patient = await prisma.patient.create({
            data: {
                name,
                phone,
                email,
                history: history ? JSON.stringify(history) : undefined,
            },
        });
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Error creating patient' });
    }
};

export const getPatientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const patient = await prisma.patient.findUnique({
            where: { id },
            include: {
                clinicalRecords: true,
                opportunities: true,
            },
        });
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching patient' });
    }
};
