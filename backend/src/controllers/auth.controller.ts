import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';

// Helper to generate tokens
const generateTokens = (userId: string) => {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: '15m', // Short-lived access token
    });

    const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
        expiresIn: '7d', // Long-lived refresh token
    });

    return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            logger.warn('Login attempt failed - user not found', { email });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            logger.warn('Login attempt failed - invalid password', { email });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Remove password from response
        const { password: _, ...safeUser } = user;

        logger.info('User logged in successfully', { userId: user.id, email });

        res.json({
            user: safeUser,
            token: accessToken, // For backward compatibility
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, clinicName, avatarUrl } = req.body;

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            logger.warn('Registration failed - user already exists', { email });
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                name,
                email,
                password: hashedPassword,
                clinic_name: clinicName,
                avatar_url: avatarUrl,
            })
            .select()
            .single();

        if (error || !user) {
            logger.error('Registration error:', error);
            return res.status(500).json({ error: 'Error creating user' });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Remove password from response
        const { password: _, ...safeUser } = user;

        logger.info('User registered successfully', { userId: user.id, email });

        res.json({
            user: safeUser,
            token: accessToken, // For backward compatibility
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
            userId: string;
            type: string;
        };

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        // Verify user still exists
        const { data: user, error } = await supabase
            .from('users')
            .select('id')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            logger.warn('Refresh token failed - user not found', { userId: decoded.userId });
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new tokens
        const tokens = generateTokens(user.id);

        logger.info('Tokens refreshed successfully', { userId: user.id });

        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error: any) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        logger.error('Refresh token error:', error);
        res.status(500).json({ error: 'Error refreshing token' });
    }
};
