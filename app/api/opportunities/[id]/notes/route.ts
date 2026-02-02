import { supabase } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { notes } = body;

        const { error } = await supabase
            .from('opportunities')
            .update({ notes })
            .eq('id', id);

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
