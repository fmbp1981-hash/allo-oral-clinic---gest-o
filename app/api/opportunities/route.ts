import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../lib/supabase';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { parseBody, createOpportunitySchema } from '../lib/validators';
import { logAudit } from '../lib/audit';

export async function GET(request: NextRequest) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

        // Filter by user_id for multi-tenancy
        const { data, error } = await supabase
            .from('opportunities')
            .select('*, clinical_records(*)')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching opportunities:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Mapear snake_case do banco para camelCase do frontend se necessário
        // Mas o frontend parece já tratar ou esperar compatibilidade.
        // Vamos garantir que clinical_records venha como clinicalRecords se for o esperado
        const formattedData = data.map((item: any) => ({
            ...item,
            clinicalRecords: item.clinical_records,
            patientId: item.patient_id, // ensure compatible camelCase
            createdAt: item.created_at,
            lastContact: item.last_contact,
            scheduledDate: item.scheduled_date,
            keywordFound: item.keyword_found || item.keyword
        }));

        return NextResponse.json(formattedData);
    } catch (err) {
        console.error('Unexpected error in GET opportunities:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const parsed = await parseBody(request, createOpportunitySchema);
        if (parsed.error) return parsed.error;
        const { patientId, status, name, phone, keywordFound, notes, scheduledDate } = parsed.data;

        // Transform camelCase to snake_case for Supabase
        const dbPayload = {
            patient_id: patientId,
            name,
            phone,
            status,
            keyword_found: keywordFound,
            notes,
            scheduled_date: scheduledDate,
            user_id: userId
        };

        const { data, error } = await supabase
            .from('opportunities')
            .insert(dbPayload)
            .select()
            .single();

        if (error) {
            console.error('Error creating opportunity:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Format response back to camelCase
        const formatted = {
            ...data,
            patientId: data.patient_id,
            createdAt: data.created_at,
            keywordFound: data.keyword_found,
            lastContact: data.last_contact,
            scheduledDate: data.scheduled_date
        };

        logAudit({ userId, action: 'opportunity_create', entityType: 'opportunity', entityId: data.id, details: { status: data.status }, request });

        return NextResponse.json(formatted);
    } catch (err) {
        console.error('Unexpected error in POST opportunity:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

        // Delete only opportunities belonging to this user
        const { error } = await supabase
            .from('opportunities')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting opportunities:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'All opportunities deleted successfully' });
    } catch (err) {
        console.error('Unexpected error in DELETE opportunities:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
