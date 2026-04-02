import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { personalizeMessage } from '@/app/lib/openai/personalize-message';
import { getSupabaseClient } from '../../lib/supabase';
import { parseBody, campaignPreviewSchema } from '../../lib/validators';

/**
 * POST /api/campaigns/preview
 * Generates AI-personalized preview messages for a sample of patients.
 * Body: { patient_ids: string[], message_template: string, sample_size?: number }
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, campaignPreviewSchema);
  if (parsed.error) return parsed.error;
  const { patient_ids: patientIds, message_template: messageTemplate, sample_size: sampleSize } = parsed.data;

  const supabase = getSupabaseClient();

  // Fetch clinic name
  const { data: settings } = await supabase
    .from('user_settings')
    .select('clinic_name')
    .eq('user_id', auth.data.userId)
    .single();

  const clinicName = (settings?.clinic_name as string) ?? 'Clínica';

  // Fetch sample patients
  const sampleIds = patientIds.slice(0, sampleSize);
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone, category, dentist_name, observations')
    .in('id', sampleIds);

  if (!patients || patients.length === 0) {
    return NextResponse.json({ error: 'Pacientes não encontrados' }, { status: 404 });
  }

  // Generate personalized previews in parallel
  const previews = await Promise.all(
    patients.map(async (p) => {
      try {
        const personalized = await personalizeMessage({
          patientName: p.name,
          category: p.category ?? undefined,
          dentistName: p.dentist_name ?? undefined,
          observations: p.observations ?? undefined,
          clinicName,
          messageTemplate,
        });
        return {
          patientId: p.id,
          patientName: p.name,
          phone: p.phone,
          original: messageTemplate,
          personalized,
        };
      } catch {
        return {
          patientId: p.id,
          patientName: p.name,
          phone: p.phone,
          original: messageTemplate,
          personalized: messageTemplate, // Fallback to template on error
          error: true,
        };
      }
    })
  );

  return NextResponse.json({ previews });
}
