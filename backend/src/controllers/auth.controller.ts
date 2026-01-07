import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';
import crypto from 'crypto';
import { emailService } from '../lib/email';

// Validação de variáveis de ambiente obrigatórias
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
}

// Helper to generate tokens
const generateTokens = (userId: string, tenantId: string) => {
    const accessToken = jwt.sign({ userId, tenantId }, JWT_SECRET, {
        expiresIn: '15m', // Short-lived access token
    });

    const refreshToken = jwt.sign({ userId, tenantId, type: 'refresh' }, JWT_REFRESH_SECRET, {
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

        // Generate tokens (use user's tenant_id or user.id as fallback for single-tenant)
        const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id || user.id);

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

        // Generate tokens (use user's tenant_id or user.id as fallback for single-tenant)
        const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id || user.id);

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
            .select('id, refresh_token_hash, tenant_id') // Fetch tenant_id too
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
        const tenantId = user.tenant_id || 'default-tenant';
        const tokens = generateTokens(user.id, tenantId);
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

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('email', email)
            .single();

        // Always return success to prevent email enumeration attacks
        // But only actually send email if user exists
        if (!error && user) {
            const resetToken = crypto.randomInt(100000, 999999).toString();
            const resetTokenHash = hashToken(resetToken);
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store hashed token in database
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    reset_token_hash: resetTokenHash,
                    reset_token_expires: expiresAt.toISOString(),
                })
                .eq('id', user.id);

            if (updateError) {
                logger.error('Error storing reset token:', updateError);
            } else {
                // Log password reset request (sem token em produção)
                logger.info('Password reset requested', {
                    email,
                    expiresAt,
                    ...(process.env.NODE_ENV === 'development' && { resetToken })
                });

                // Enviar email de reset de senha
                const emailSent = await emailService.sendPasswordResetEmail(
                    user.email,
                    resetToken,
                    user.name
                );

                if (emailSent) {
                    logger.info('Password reset email sent successfully', { email });
                } else {
                    logger.warn('Failed to send password reset email', { email });
                    // Em desenvolvimento, mostrar token no console se email não foi enviado
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`\n🔑 PASSWORD RESET TOKEN FOR ${email}: ${resetToken}\n`);
                    }
                }
            }
        } else {
            // Log suspicious activity
            logger.warn('Password reset requested for non-existent email', { email });
        }

        // Always return success
        res.json({
            message: 'If this email exists, a reset code will be sent to it.'
        });
    } catch (error: any) {
        logger.error('Password reset request error:', error);
        res.status(500).json({ error: 'Error processing password reset request' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        // Validate inputs
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ error: 'Email, reset token, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('id, reset_token_hash, reset_token_expires')
            .eq('email', email)
            .single();

        if (error || !user) {
            logger.warn('Password reset failed - user not found', { email });
            return res.status(400).json({ error: 'Invalid email or reset token' });
        }

        // Check if reset token exists
        if (!user.reset_token_hash || !user.reset_token_expires) {
            logger.warn('Password reset failed - no active reset request', { email });
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token is expired
        const expiresAt = new Date(user.reset_token_expires);
        if (expiresAt < new Date()) {
            logger.warn('Password reset failed - token expired', { email });
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Verify token
        const resetTokenHash = hashToken(resetToken);
        if (resetTokenHash !== user.reset_token_hash) {
            logger.warn('Password reset failed - invalid token', { email });
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                reset_token_hash: null,
                reset_token_expires: null,
                refresh_token_hash: null, // Invalidate existing sessions
            })
            .eq('id', user.id);

        if (updateError) {
            logger.error('Error updating password:', updateError);
            return res.status(500).json({ error: 'Error resetting password' });
        }

        logger.info('Password reset successfully', { userId: user.id, email });

        res.json({ message: 'Password reset successfully. You can now login with your new password.' });
    } catch (error: any) {
        logger.error('Password reset error:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
};
