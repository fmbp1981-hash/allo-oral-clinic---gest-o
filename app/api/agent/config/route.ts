import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { parseBody, updateAgentConfigSchema } from '../../lib/validators';

export interface AgentConfig {
  enabled: boolean;
  name: string;
  clinic_name: string;
  specialties: string[];
  tone: string;
  custom_instructions: string;
  openai_model: string;
  max_context_messages: number;
}

const DEFAULTS: AgentConfig = {
  enabled: false,
  name: 'Assistente',
  clinic_name: '',
  specialties: [],
  tone: 'friendly',
  custom_instructions: '',
  openai_model: 'gpt-4o-mini',
  max_context_messages: 10,
};

/**
 * GET /api/agent/config
 * Returns current agent configuration.
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_settings')
    .select('agent_config, clinic_name')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Erro ao buscar configuração do agente' }, { status: 500 });
  }

  const saved = (data?.agent_config as Partial<AgentConfig>) ?? {};
  const config: AgentConfig = {
    ...DEFAULTS,
    clinic_name: (data?.clinic_name as string) ?? '',
    ...saved,
  };

  return NextResponse.json(config);
}

/**
 * PUT /api/agent/config
 * Updates agent configuration stored in user_settings.agent_config.
 */
export async function PUT(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const supabase = getSupabaseClient();

  const parsed = await parseBody(request, updateAgentConfigSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  // Merge with existing config
  const { data: existing } = await supabase
    .from('user_settings')
    .select('agent_config')
    .eq('user_id', userId)
    .single();

  const current = (existing?.agent_config as Partial<AgentConfig>) ?? {};
  const updated: AgentConfig = { ...DEFAULTS, ...current, ...body };

  const { error } = await supabase
    .from('user_settings')
    .update({ agent_config: updated })
    .eq('user_id', userId);

  if (error) {
    console.error('Update agent config error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
