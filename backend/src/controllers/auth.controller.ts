import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id);

        const { password: _, ...safeUser } = user;
        res.json({
            user: safeUser,
            token: accessToken, // For backward compatibility
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, clinicName, avatarUrl } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                clinicName,
                avatarUrl,
            },
        });

        const { accessToken, refreshToken } = generateTokens(user.id);

        const { password: _, ...safeUser } = user;
        res.json({
            user: safeUser,
            token: accessToken, // For backward compatibility
            accessToken,
            refreshToken,
        });
    } catch (error) {
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
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new tokens
        const tokens = generateTokens(user.id);

        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        res.status(500).json({ error: 'Error refreshing token' });
    }
};
