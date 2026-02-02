import { supabase } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { status, scheduledDate } = body;

        const updateData: any = {
            status,
            last_contact: new Date().toISOString()
        };

        // Only update scheduled_date if provided (or strictly null if intending to clear, but usually we just update if present)
        if (scheduledDate !== undefined) {
            updateData.scheduled_date = scheduledDate;
        }

        const { error } = await supabase
            .from('opportunities')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Internal error updating status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
