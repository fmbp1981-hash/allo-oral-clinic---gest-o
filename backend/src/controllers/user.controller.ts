import { Response } from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, clinic_name, avatar_url, created_at, updated_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Error fetching users' });
        }

        res.json(users || []);
    } catch (error: any) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, clinic_name, avatar_url, created_at, updated_at')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error || !user) {
            logger.warn('User not found', { userId: id });
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error: any) {
        logger.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, clinicName, avatarUrl } = req.body;
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            logger.warn('User creation failed - user already exists', { email });
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: hashedPassword,
                clinic_name: clinicName,
                avatar_url: avatarUrl,
                tenant_id: tenantId,
            })
            .select('id, name, email, clinic_name, avatar_url, created_at, updated_at')
            .single();

        if (error || !user) {
            logger.error('Error creating user:', error);
            return res.status(500).json({ error: 'Error creating user' });
        }

        logger.info('User created', { userId: user.id, email });
        res.json(user);
    } catch (error: any) {
        logger.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, clinicName, avatarUrl } = req.body;
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (clinicName !== undefined) updateData.clinic_name = clinicName;
        if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select('id, name, email, clinic_name, avatar_url, created_at, updated_at')
            .single();

        if (error) {
            logger.error('Error updating user:', error);
            return res.status(500).json({ error: 'Error updating user' });
        }

        logger.info('User updated', { userId: id });
        res.json(user);
    } catch (error: any) {
        logger.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) {
            logger.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Error deleting user' });
        }

        logger.info('User deleted', { userId: id });
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};
