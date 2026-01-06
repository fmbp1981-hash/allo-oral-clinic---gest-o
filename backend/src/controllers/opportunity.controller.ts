import { Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: opportunities, error } = await supabase
            .from('opportunities')
            .select(`
                *,
                patient:patients(*)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching opportunities:', error);
            return res.status(500).json({ error: 'Error fetching opportunities' });
        }

        res.json(opportunities || []);
    } catch (error: any) {
        logger.error('Error fetching opportunities:', error);
        res.status(500).json({ error: 'Error fetching opportunities' });
    }
};

export const createOpportunity = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { patientId, name, phone, keywordFound, status } = req.body;

        const { data: opportunity, error } = await supabase
            .from('opportunities')
            .insert({
                patient_id: patientId,
                name,
                phone,
                keyword_found: keywordFound,
                status: status || 'NEW',
                user_id: userId,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error || !opportunity) {
            logger.error('Error creating opportunity:', error);
            return res.status(500).json({ error: 'Error creating opportunity' });
        }

        logger.info('Opportunity created', { opportunityId: opportunity.id });
        res.json(opportunity);
    } catch (error: any) {
        logger.error('Error creating opportunity:', error);
        res.status(500).json({ error: 'Error creating opportunity' });
    }
};

export const searchOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { keyword, limit = 10 } = req.body;

        logger.info('Searching opportunities', { keyword, limit });

        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinical_records:clinical_records(*)
            `)
            .eq('tenant_id', tenantId)
            .ilike('history', `%${keyword.toLowerCase()}%`)
            .limit(parseInt(limit as string));

        if (error) {
            logger.error('Search error:', error);
            return res.status(500).json({ error: 'Error searching opportunities' });
        }

        const opportunities = (patients || []).map(patient => ({
            id: `opp_${Date.now()}_${patient.id}`,
            patientId: patient.id,
            name: patient.name,
            phone: patient.phone,
            keywordFound: keyword,
            status: 'NEW',
            createdAt: new Date().toISOString(),
            clinicalRecords: patient.clinical_records || [],
        }));

        logger.info('Search completed', { found: opportunities.length });
        res.json(opportunities);
    } catch (error: any) {
        logger.error('Search error:', error);
        res.status(500).json({ error: 'Error searching opportunities' });
    }
};

export const updateOpportunityStatus = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { status, scheduledDate } = req.body;

        const updateData: any = {
            status,
            last_contact: new Date().toISOString(),
        };

        if (scheduledDate) {
            updateData.scheduled_date = scheduledDate;
        }

        const { data: opportunity, error } = await supabase
            .from('opportunities')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) {
            logger.error('Update status error:', error);
            return res.status(500).json({ error: 'Error updating opportunity status' });
        }

        logger.info('Opportunity status updated', { opportunityId: id, status });
        res.json(opportunity);
    } catch (error: any) {
        logger.error('Update status error:', error);
        res.status(500).json({ error: 'Error updating opportunity status' });
    }
};

export const updateOpportunityNotes = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { notes } = req.body;

        const { data: opportunity, error } = await supabase
            .from('opportunities')
            .update({ notes })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) {
            logger.error('Update notes error:', error);
            return res.status(500).json({ error: 'Error updating opportunity notes' });
        }

        logger.info('Opportunity notes updated', { opportunityId: id });
        res.json(opportunity);
    } catch (error: any) {
        logger.error('Update notes error:', error);
        res.status(500).json({ error: 'Error updating opportunity notes' });
    }
};

export const deleteOpportunity = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('opportunities')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) {
            logger.error('Delete error:', error);
            return res.status(500).json({ error: 'Error deleting opportunity' });
        }

        logger.info('Opportunity deleted', { opportunityId: id });
        res.json({ message: 'Opportunity deleted successfully' });
    } catch (error: any) {
        logger.error('Delete error:', error);
        res.status(500).json({ error: 'Error deleting opportunity' });
    }
};

export const deleteAllOpportunities = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;
        
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { error } = await supabase
            .from('opportunities')
            .delete()
            .eq('tenant_id', tenantId);

        if (error) {
            logger.error('Delete all error:', error);
            return res.status(500).json({ error: 'Error deleting all opportunities' });
        }

        logger.info('All opportunities deleted');
        res.json({ message: 'All opportunities deleted successfully' });
    } catch (error: any) {
        logger.error('Delete all error:', error);
        res.status(500).json({ error: 'Error deleting all opportunities' });
    }
};
