import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany();
        // Remove passwords from response
        const safeUsers = users.map(user => {
            const { password, ...rest } = user;
            return rest;
        });
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, clinicName, avatarUrl } = req.body;
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password, // In a real app, hash this!
                clinicName,
                avatarUrl,
            },
        });
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
};
