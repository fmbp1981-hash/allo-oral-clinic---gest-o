import { Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
            `)
            `)
            .eq('tenant_id', tenantId)
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

export const createPatient = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, phone, email, history } = req.body;

        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                name,
                phone,
                email,
                history: history || '',
                history: history || '',
                user_id: userId,
                tenant_id: tenantId,
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

export const getPatientById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { data: patient, error } = await supabase
            .from('patients')
            .select(`
            *,
            clinical_records: clinical_records(*),
                opportunities: opportunities(*)
                    `)
            .eq('id', id)
            .eq('tenant_id', tenantId) // Scope by tenant
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

export const updatePatient = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

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
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)
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

export const deletePatient = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id)
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

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

export const searchPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

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
                    clinical_records: clinical_records(*),
                        opportunities: opportunities(*)
            `)
            `)
            .eq('tenant_id', tenantId)
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

export const importPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { patients } = req.body;

        if (!patients || !Array.isArray(patients) || patients.length === 0) {
            return res.status(400).json({ error: 'No patients data provided' });
        }

        logger.info('Importing patients', { count: patients.length, userId });

        // Validate and prepare patients data
        const validPatients = patients.map((p: any) => ({
            name: p.name || p.Nome || p.NOME || '',
            phone: p.phone || p.Telefone || p.TELEFONE || p.Celular || p.CELULAR || '',
            email: p.email || p.Email || p.EMAIL || p['E-mail'] || '',
            history: p.history || p.Historico || p.HISTORICO || p.Observacoes || p.OBSERVACOES || '',
            history: p.history || p.Historico || p.HISTORICO || p.Observacoes || p.OBSERVACOES || '',
            user_id: userId,
            tenant_id: tenantId,
        })).filter(p => p.name && p.phone); // Only import if has name and phone

        if (validPatients.length === 0) {
            return res.status(400).json({ error: 'No valid patients found in file' });
        }

        // Insert patients in batches of 100
        const batchSize = 100;
        let imported = 0;
        const errors: string[] = [];

        for (let i = 0; i < validPatients.length; i += batchSize) {
            const batch = validPatients.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('patients')
                .insert(batch)
                .select();

            if (error) {
                logger.error('Batch import error:', error);
                errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
            } else {
                imported += data?.length || 0;
            }
        }

        logger.info('Import completed', {
            total: patients.length,
            valid: validPatients.length,
            imported,
            errors: errors.length
        });

        res.json({
            success: true,
            message: `Successfully imported ${imported} patients`,
            total: patients.length,
            valid: validPatients.length,
            imported,
            skipped: validPatients.length - imported,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        logger.error('Import error:', error);
        res.status(500).json({ error: 'Error importing patients' });
    }
};
