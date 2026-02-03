import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient } from '../../../../lib/supabase';

interface RouteParams {
    params: Promise<{ userId: string }>;
}

// POST /api/admin/users/[userId]/approve
// Approve or revoke user approval
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId } = await params;
        const auth = validateAuthHeader(request);

        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId: requestingUserId } = auth.data;
        const supabase = getSupabaseClient();

        // Check if requesting user is admin
        const { data: adminUser, error: adminError } = await supabase
            .from('users')
            .select('role')
            .eq('id', requestingUserId)
            .single();

        if (adminError || !adminUser || adminUser.role !== 'admin') {
            return NextResponse.json(
                { error: 'Apenas administradores podem aprovar usuários' },
                { status: 403 }
            );
        }

        const { approved } = await request.json();

        if (typeof approved !== 'boolean') {
            return NextResponse.json(
                { error: 'Campo approved é obrigatório e deve ser boolean' },
                { status: 400 }
            );
        }

        // Update user approval status
        const { data, error } = await supabase
            .from('users')
            .update({ approved })
            .eq('id', userId)
            .select('id, name, email, approved')
            .single();

        if (error) {
            console.error('Error updating approval:', error);
            return NextResponse.json(
                { error: 'Erro ao atualizar aprovação do usuário' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: approved ? 'Usuário aprovado com sucesso' : 'Aprovação revogada',
            user: data,
        });
    } catch (error: unknown) {
        console.error('Approve user error:', error);
        return NextResponse.json(
            { error: 'Erro ao processar aprovação' },
            { status: 500 }
        );
    }
}
