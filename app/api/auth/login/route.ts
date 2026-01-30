import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';

// Helper to generate tokens
const generateTokens = (userId: string, tenantId: string) => {
  const accessToken = jwt.sign({ userId, tenantId }, JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ userId, tenantId, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

// Helper to hash refresh token
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  clinic_name: string;
  avatar_url: string;
  role: string;
  tenant_id?: string;
  refresh_token_hash?: string;
  approved?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    const user = data as UserRecord | null;

    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Check if user is approved (admin users are always approved)
    if (user.approved === false && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sua conta ainda não foi aprovada pelo administrador. Aguarde a liberação do acesso.' },
        { status: 403 }
      );
    }


    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id || user.id);

    // Store refresh token hash in DB
    const refreshTokenHash = hashToken(refreshToken);
    await supabase
      .from('users')
      .update({ refresh_token_hash: refreshTokenHash })
      .eq('id', user.id);

    // Remove sensitive data from response
    const { password: _pwd, refresh_token_hash: _hash, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
