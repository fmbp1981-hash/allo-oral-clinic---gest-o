import { supabase } from '../../../lib/supabase';
import { NextResponse } from 'next/server';

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { status, scheduledDate } = body;

        console.log(`Updating opportunity ${id} to status: ${status}`);

        const updateData: Record<string, unknown> = {
            status,
            last_contact: new Date().toISOString()
        };

        // Only update scheduled_date if provided
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

        console.log(`Successfully updated opportunity ${id}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Internal error updating status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
