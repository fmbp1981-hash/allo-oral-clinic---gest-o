import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  clinic_name: string;
  role: string;
  created_at: string;
  approved?: boolean;
}

interface UserListItem {
  id: string;
  email: string;
  name: string;
  companyName: string;
  role: 'admin' | 'operador' | 'visualizador';
  status: 'configured' | 'pending';
  approved: boolean;
  createdAt: string;
  integrations: {
    trello: boolean;
    whatsapp: boolean;
  };
}

/**
 * GET /api/admin/users
 * Lista todos os usuários do sistema (apenas admin)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const supabase = getSupabaseClient();

    // Verificar se o usuário é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
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

    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, clinic_name, role, created_at, approved')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Erro ao buscar usuários' },
        { status: 500 }
      );
    }

    // Buscar configurações de Trello para todos os usuários
    const { data: trelloConfigs } = await supabase
      .from('trello_config')
      .select('user_id, board_id');

    // Buscar configurações de WhatsApp para todos os usuários
    const { data: whatsappConfigs } = await supabase
      .from('user_settings')
      .select('user_id, evolution_api_url, evolution_api_key');

    // Mapear para o formato esperado
    const userList: UserListItem[] = (users || []).map((u: UserRecord) => {
      const hasTrello = trelloConfigs?.some(
        (tc: { user_id: string; board_id?: string }) => tc.user_id === u.id && tc.board_id
      );
      const hasWhatsapp = whatsappConfigs?.some(
        (wc: { user_id: string; evolution_api_url?: string; evolution_api_key?: string }) =>
          wc.user_id === u.id && wc.evolution_api_url && wc.evolution_api_key
      );

      const isConfigured = hasTrello || hasWhatsapp;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        companyName: u.clinic_name || 'Sem empresa',
        role: (u.role as 'admin' | 'operador' | 'visualizador') || 'visualizador',
        status: isConfigured ? 'configured' : 'pending',
        approved: u.approved ?? (u.role === 'admin'),
        createdAt: u.created_at || new Date().toISOString(),
        integrations: {
          trello: !!hasTrello,
          whatsapp: !!hasWhatsapp,
        },
      };
    });

    return NextResponse.json(userList);
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
