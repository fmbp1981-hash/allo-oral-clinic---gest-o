import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { validateAuthHeader, isAuthError } from '../../../lib/auth';

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const { id } = await context.params;
        const body = await request.json();
        const { notes } = body;

        // Update only if opportunity belongs to this user
        const { error } = await supabase
            .from('opportunities')
            .update({ notes })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating notes:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Internal error updating notes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
