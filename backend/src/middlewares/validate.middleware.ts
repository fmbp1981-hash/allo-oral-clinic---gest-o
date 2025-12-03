import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import logger from '../lib/logger';

export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            logger.warn('Validation error', { path: req.path, errors: error.errors });
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors.map((err) => ({
                    field: err.path.join('.').replace('body.', ''),
                    message: err.message,
                })),
            });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};
