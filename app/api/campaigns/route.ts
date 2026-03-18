import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { personalizeMessage } from '@/app/lib/openai/personalize-message';

/**
 * GET /api/campaigns
 * Lists all campaigns for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('List campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao listar campanhas' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/campaigns
 * Creates a new campaign draft and generates personalized messages for each patient.
 * Body: { name, patient_ids: string[], message_template: string }
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const supabase = getSupabaseClient();

  const body = await request.json() as {
    name?: string;
    patient_ids?: string[];
    message_template?: string;
  };

  const { name, patient_ids, message_template } = body;
  if (!name || !patient_ids?.length || !message_template) {
    return NextResponse.json(
      { error: 'name, patient_ids e message_template são obrigatórios' },
      { status: 400 }
    );
  }

  // Fetch patients for this user
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id, name, category, dentist_name, observations')
    .eq('user_id', userId)
    .in('id', patient_ids);

  if (pErr) {
    return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
  }

  // Fetch clinic name from user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('clinic_name, agent_config')
    .eq('user_id', userId)
    .single();

  const clinicName = (settings?.clinic_name as string | null) ?? 'Clínica';

  // Create campaign record
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name,
      message_template,
      status: 'draft',
      total_patients: patients?.length ?? 0,
    })
    .select()
    .single();

  if (cErr || !campaign) {
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 });
  }

  // Generate personalized messages for each patient
  const campaignPatients = await Promise.all(
    (patients ?? []).map(async (p) => {
      let personalized = message_template;
      try {
        personalized = await personalizeMessage({
          patientName: p.name as string,
          category: p.category as string | undefined,
          dentistName: p.dentist_name as string | undefined,
          observations: p.observations as string | undefined,
          clinicName,
          messageTemplate: message_template,
        });
      } catch (err) {
        console.warn(`Personalization failed for patient ${p.id}:`, err);
        // Fallback: simple variable substitution
        personalized = message_template.replace(/{nome}/gi, p.name as string);
      }
      return {
        campaign_id: campaign.id as string,
        patient_id: p.id as string,
        personalized_message: personalized,
        status: 'pending',
      };
    })
  );

  const { error: cpErr } = await supabase.from('campaign_patients').insert(campaignPatients);
  if (cpErr) {
    console.error('Campaign patients insert error:', cpErr);
    return NextResponse.json({ error: 'Erro ao preparar mensagens' }, { status: 500 });
  }

  return NextResponse.json(campaign, { status: 201 });
}
