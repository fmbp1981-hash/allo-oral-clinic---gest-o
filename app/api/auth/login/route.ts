import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

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
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

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

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id || user.id);

    // Store refresh token hash in DB
    const refreshTokenHash = hashToken(refreshToken);
    await supabase
      .from('users')
      .update({ refresh_token_hash: refreshTokenHash })
      .eq('id', user.id);

    // Remove sensitive data from response
    const { password: _, refresh_token_hash: __, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
