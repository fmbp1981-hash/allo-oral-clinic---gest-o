import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

export const getPatients = async (req: Request, res: Response) => {
    try {
        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching patients:', error);
            return res.status(500).json({ error: 'Error fetching patients' });
        }

        res.json(patients || []);
    } catch (error: any) {
        logger.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Error fetching patients' });
    }
};

export const createPatient = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, history } = req.body;

        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                name,
                phone,
                email,
                history: history || '',
            })
            .select()
            .single();

        if (error || !patient) {
            logger.error('Error creating patient:', error);
            return res.status(500).json({ error: 'Error creating patient' });
        }

        logger.info('Patient created', { patientId: patient.id });
        res.json(patient);
    } catch (error: any) {
        logger.error('Error creating patient:', error);
        res.status(500).json({ error: 'Error creating patient' });
    }
};

export const getPatientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: patient, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
            `)
            .eq('id', id)
            .single();

        if (error || !patient) {
            logger.warn('Patient not found', { patientId: id });
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json(patient);
    } catch (error: any) {
        logger.error('Error fetching patient:', error);
        res.status(500).json({ error: 'Error fetching patient' });
    }
};

export const updatePatient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, email, history } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (history !== undefined) updateData.history = history;

        const { data: patient, error } = await supabase
            .from('patients')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Error updating patient:', error);
            return res.status(500).json({ error: 'Error updating patient' });
        }

        logger.info('Patient updated', { patientId: id });
        res.json(patient);
    } catch (error: any) {
        logger.error('Error updating patient:', error);
        res.status(500).json({ error: 'Error updating patient' });
    }
};

export const deletePatient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('Error deleting patient:', error);
            return res.status(500).json({ error: 'Error deleting patient' });
        }

        logger.info('Patient deleted', { patientId: id });
        res.json({ message: 'Patient deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting patient:', error);
        res.status(500).json({ error: 'Error deleting patient' });
    }
};

export const searchPatients = async (req: Request, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        logger.info('Searching patients', { query });

        // Search in name, phone, email, and history
        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
            `)
            .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,history.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logger.error('Search error:', error);
            return res.status(500).json({ error: 'Error searching patients' });
        }

        logger.info('Search completed', { found: patients?.length || 0 });
        res.json(patients || []);
    } catch (error: any) {
        logger.error('Search error:', error);
        res.status(500).json({ error: 'Error searching patients' });
    }
};
