import { Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
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
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
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
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { data: patient, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
            `)
            .eq('id', id)
            .eq('tenant_id', tenantId)
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
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
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
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('patients')
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
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        logger.info('Searching patients', { query });

        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*),
                opportunities:opportunities(*)
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

// Helper to extract a field from a row using multiple possible column names
const extractField = (row: Record<string, any>, ...keys: string[]): string => {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return String(row[key]).trim();
        }
    }
    return '';
};

// Normalize phone number: keep only digits
const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
};

export const importPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { patients } = req.body;

        if (!patients || !Array.isArray(patients) || patients.length === 0) {
            return res.status(400).json({ error: 'No patients data provided' });
        }

        logger.info('Importing patients', { count: patients.length, userId });

        // Flexible column mapping with many Portuguese/English variations
        const validPatients = patients.map((p: any) => {
            const name = extractField(p, 'name', 'Name', 'Nome', 'NOME', 'nome', 'Paciente', 'PACIENTE', 'paciente');
            const rawPhone = extractField(p, 'phone', 'Phone', 'Telefone', 'TELEFONE', 'telefone', 'Celular', 'CELULAR', 'celular', 'Tel', 'tel', 'Fone', 'fone', 'WhatsApp', 'whatsapp');
            const phone = normalizePhone(rawPhone);
            const email = extractField(p, 'email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-Mail');
            const history = extractField(p, 'history', 'History', 'Historico', 'HISTORICO', 'historico', 'Histórico', 'histórico', 'Observacoes', 'OBSERVACOES', 'observacoes', 'Observações', 'observações', 'Tratamento', 'tratamento', 'TRATAMENTO', 'Procedimento', 'procedimento');
            const lastVisit = extractField(p, 'lastVisit', 'last_visit', 'Ultima Visita', 'ultima_visita', 'ULTIMA_VISITA', 'Última Visita', 'Data', 'data');

            return {
                name,
                phone,
                email: email || null,
                history: history || null,
                last_visit: lastVisit || null,
                user_id: userId,
                tenant_id: tenantId,
            };
        }).filter((p: any) => p.name && p.phone);

        if (validPatients.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum paciente válido encontrado. Verifique se o arquivo possui colunas "Nome" e "Telefone".',
                total: patients.length,
                valid: 0,
                imported: 0,
            });
        }

        // Fetch existing phones for this tenant to detect duplicates
        const { data: existingPatients } = await supabase
            .from('patients')
            .select('phone')
            .eq('tenant_id', tenantId);

        const existingPhones = new Set((existingPatients || []).map((p: { phone: string }) => normalizePhone(p.phone)));

        // Separate new patients from duplicates
        const newPatients = validPatients.filter((p: any) => !existingPhones.has(p.phone));
        const duplicateCount = validPatients.length - newPatients.length;

        const batchSize = 100;
        let imported = 0;
        const errors: string[] = [];

        for (let i = 0; i < newPatients.length; i += batchSize) {
            const batch = newPatients.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('patients')
                .insert(batch)
                .select();

            if (error) {
                logger.error('Batch import error:', error);
                errors.push(`Lote ${i / batchSize + 1}: ${error.message}`);
            } else {
                imported += data?.length || 0;
            }
        }

        logger.info('Import completed', {
            total: patients.length,
            valid: validPatients.length,
            imported,
            duplicates: duplicateCount,
            errors: errors.length
        });

        res.json({
            success: true,
            message: `${imported} paciente(s) importado(s) com sucesso`,
            total: patients.length,
            valid: validPatients.length,
            imported,
            skipped: duplicateCount + (newPatients.length - imported),
            duplicates: duplicateCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        logger.error('Import error:', error);
        res.status(500).json({ error: 'Error importing patients' });
    }
};
