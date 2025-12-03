import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    }),
});

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
        clinicName: z.string().min(2, 'O nome da clínica deve ter no mínimo 2 caracteres'),
        avatarUrl: z.string().url('URL do avatar inválida').optional().nullable(),
    }),
});

export const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
    }),
});
