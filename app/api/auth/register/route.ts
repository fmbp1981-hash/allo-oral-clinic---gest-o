import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  clinic_name: string;
  avatar_url: string;
  role: string;
  tenant_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, clinicName, avatarUrl } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with 'visualizador' role and unapproved status
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        clinic_name: clinicName || 'Minha Clínica',
        avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
        role: 'visualizador',
        approved: false,
      })
      .select()
      .single();


    const user = data as UserRecord | null;

    if (error || !user) {
      console.error('Registration error:', error);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id || user.id);

    // Remove sensitive data
    const { password: _pwd, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      token: accessToken,
      accessToken,
      refreshToken,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar usuário' },
      { status: 500 }
    );
  }
}
