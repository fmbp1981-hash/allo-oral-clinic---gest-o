import { NextResponse } from 'next/server';
import { supabase } from '../lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let query = supabase
            .from('opportunities')
            .select('*, clinical_records(*)');

        // Se tiver userId (e logicamente implementarmos tenant isolation), filtramos aqui
        // Por enquanto, traz tudo

        const { data, error } = await query;

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


export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.patientId || !body.status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Transform camelCase to snake_case for Supabase
        // Note: clinical_records is a separate table, not a column
        const dbPayload = {
            patient_id: body.patientId,
            name: body.name,
            phone: body.phone,
            status: body.status,
            keyword_found: body.keywordFound,
            notes: body.notes,
            scheduled_date: body.scheduledDate
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

        return NextResponse.json(formatted);
    } catch (err) {
        console.error('Unexpected error in POST opportunity:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        // Atenção: Isso apaga TODAS as oportunidades.
        // Deve ser restrito a admin ou tenant owner.

        const { error } = await supabase
            .from('opportunities')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack simples para deletar tudo (id != uuid-zero)

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
