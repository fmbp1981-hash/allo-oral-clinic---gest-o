import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../../lib/supabase';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Obtém detalhes completos de um usuário (apenas admin)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId: adminId } = auth.data;
    const { userId } = await params;
    const supabase = getSupabaseClient();

    // Verificar se o usuário é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta área.' },
        { status: 403 }
      );
    }

    // Buscar dados do usuário
    const { data: user, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, name, clinic_name, role, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (targetUserError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.clinic_name,
      role: user.role || 'visualizador',
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users/[userId]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[userId]
 * Atualiza dados e role de um usuário (apenas admin)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId: adminId } = auth.data;
    const { userId } = await params;
    const supabase = getSupabaseClient();

    // Verificar se o usuário é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta área.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, companyName, role } = body;

    // Validar role
    const validRoles = ['admin', 'operador', 'visualizador'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido. Use: admin, operador ou visualizador' },
        { status: 400 }
      );
    }

    // Atualizar usuário
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (companyName) updateData.clinic_name = companyName;
    if (role) updateData.role = role;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, clinic_name, role, avatar_url, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        companyName: updatedUser.clinic_name,
        role: updatedUser.role || 'visualizador',
        avatarUrl: updatedUser.avatar_url,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[userId]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
