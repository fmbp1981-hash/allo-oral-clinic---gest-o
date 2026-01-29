import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface UserRecord {
  id: string;
  reset_token: string | null;
  reset_token_expires: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Email, token e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Hash the token to compare with database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const { data, error } = await supabase
      .from('users')
      .select('id, reset_token, reset_token_expires')
      .eq('email', email.toLowerCase().trim())
      .single();

    const user = data as UserRecord | null;

    if (error || !user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Verify token matches and hasn't expired
    if (user.reset_token !== tokenHash) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 400 }
      );
    }

    if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Token expirado. Solicite uma nova redefinição.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Senha redefinida com sucesso. Você já pode fazer login.',
    });
  } catch (error: unknown) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    );
  }
}
