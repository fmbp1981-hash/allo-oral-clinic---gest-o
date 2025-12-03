import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';
import crypto from 'crypto';

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

// Helper to hash refresh token
const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
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

        // Store refresh token hash in DB
        const refreshTokenHash = hashToken(refreshToken);
        const { error: updateError } = await supabase
            .from('users')
            .update({ refresh_token_hash: refreshTokenHash })
            .eq('id', user.id);

        if (updateError) {
            logger.error('Error saving refresh token:', updateError);
            return res.status(500).json({ error: 'Error processing login' });
        }

        // Remove sensitive data from response
        const { password: _, refresh_token_hash: __, ...safeUser } = user;

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

        // Store refresh token hash in DB
        const refreshTokenHash = hashToken(refreshToken);
        await supabase
            .from('users')
            .update({ refresh_token_hash: refreshTokenHash })
            .eq('id', user.id);

        // Remove sensitive data from response
        const { password: _, refresh_token_hash: __, ...safeUser } = user;

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

        // Verify refresh token signature
        let decoded: any;
        try {
            decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({ error: 'Invalid refresh token signature' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        // Verify user and stored hash
        const { data: user, error } = await supabase
            .from('users')
            .select('id, refresh_token_hash')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            logger.warn('Refresh token failed - user not found', { userId: decoded.userId });
            return res.status(401).json({ error: 'User not found' });
        }

        // Verify if token matches stored hash
        const incomingTokenHash = hashToken(refreshToken);
        if (incomingTokenHash !== user.refresh_token_hash) {
            logger.warn('Refresh token failed - token mismatch (possible reuse or revocation)', { userId: decoded.userId });
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Generate new tokens (Rotate refresh token for extra security)
        const tokens = generateTokens(user.id);
        const newRefreshTokenHash = hashToken(tokens.refreshToken);

        // Update DB with new hash
        await supabase
            .from('users')
            .update({ refresh_token_hash: newRefreshTokenHash })
            .eq('id', user.id);

        logger.info('Tokens refreshed successfully', { userId: user.id });

        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error: any) {
        logger.error('Refresh token error:', error);
        res.status(500).json({ error: 'Error refreshing token' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        // Ideally we should get userId from the authenticated request
        // But logout might be called even if access token is expired, so we rely on body or just success
        // For a proper implementation, we should decode the access token (ignoring expiration) or use the refresh token to identify user

        // Simple implementation: if we have a user in request (from auth middleware), invalidate their token
        // If not, we just return success to client

        // Note: You need to ensure your auth middleware attaches user to req
        const userId = (req as any).user?.userId;

        if (userId) {
            await supabase
                .from('users')
                .update({ refresh_token_hash: null })
                .eq('id', userId);
            logger.info('User logged out', { userId });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Error logging out' });
    }
};
