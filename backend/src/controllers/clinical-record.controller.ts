import { Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getClinicalRecords = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { patientId } = req.query;

        let query = supabase
            .from('clinical_records')
            .select(`
                *,
                patient:patients(*),
                opportunity:opportunities(*)
            `)
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (patientId) {
            query = query.eq('patient_id', String(patientId));
        }

        const { data: records, error } = await query;

        if (error) {
            logger.error('Error fetching clinical records:', error);
            return res.status(500).json({ error: 'Error fetching clinical records' });
        }

        res.json(records || []);
    } catch (error: any) {
        logger.error('Error fetching clinical records:', error);
        res.status(500).json({ error: 'Error fetching clinical records' });
    }
};

export const createClinicalRecord = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { date, description, type, patientId, opportunityId } = req.body;

        const { data: record, error } = await supabase
            .from('clinical_records')
            .insert({
                date: new Date(date).toISOString(),
                description,
                type,
                patient_id: patientId,
                opportunity_id: opportunityId,
                user_id: userId,
            })
            .select()
            .single();

        if (error || !record) {
            logger.error('Error creating clinical record:', error);
            return res.status(500).json({ error: 'Error creating clinical record' });
        }

        logger.info('Clinical record created', { recordId: record.id });
        res.json(record);
    } catch (error: any) {
        logger.error('Error creating clinical record:', error);
        res.status(500).json({ error: 'Error creating clinical record' });
    }
};

export const updateClinicalRecord = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { date, description, type } = req.body;

        const updateData: any = {};
        if (date !== undefined) updateData.date = new Date(date).toISOString();
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;

        const { data: record, error } = await supabase
            .from('clinical_records')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating clinical record:', error);
            return res.status(500).json({ error: 'Error updating clinical record' });
        }

        logger.info('Clinical record updated', { recordId: id });
        res.json(record);
    } catch (error: any) {
        logger.error('Error updating clinical record:', error);
        res.status(500).json({ error: 'Error updating clinical record' });
    }
};

export const deleteClinicalRecord = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('clinical_records')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            logger.error('Error deleting clinical record:', error);
            return res.status(500).json({ error: 'Error deleting clinical record' });
        }

        logger.info('Clinical record deleted', { recordId: id });
        res.json({ message: 'Clinical record deleted' });
    } catch (error: any) {
        logger.error('Error deleting clinical record:', error);
        res.status(500).json({ error: 'Error deleting clinical record' });
    }
};
