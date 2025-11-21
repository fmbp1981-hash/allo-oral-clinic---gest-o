import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '7d',
        });

        const { password: _, ...safeUser } = user;
        res.json({ user: safeUser, token });
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

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '7d',
        });

        const { password: _, ...safeUser } = user;
        res.json({ user: safeUser, token });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
};
