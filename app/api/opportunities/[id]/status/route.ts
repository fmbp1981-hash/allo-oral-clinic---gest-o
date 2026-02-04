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
        const { status, scheduledDate } = body;

        console.log(`Updating opportunity ${id} to status: ${status} for user ${userId}`);

        const updateData: Record<string, unknown> = {
            status,
            last_contact: new Date().toISOString()
        };

        // Only update scheduled_date if provided
        if (scheduledDate !== undefined) {
            updateData.scheduled_date = scheduledDate;
        }

        // Update only if opportunity belongs to this user
        const { error, count } = await supabase
            .from('opportunities')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

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
