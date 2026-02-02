import { supabase } from '../../lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" (0 rows)
      console.error('Error fetching settings:', error);
      // Return default if error (or table missing)
      return NextResponse.json({ defaultRole: 'user', messageTemplate: '' });
    }

    if (!data) {
      return NextResponse.json({ defaultRole: 'user', messageTemplate: '' });
    }

    return NextResponse.json({
      defaultRole: data.default_role,
      messageTemplate: data.message_template
    });
  } catch (error) {
    console.error('Internal error fetching settings:', error);
    return NextResponse.json({ defaultRole: 'user' });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { defaultRole, messageTemplate } = body;

    // Upsert into app_settings (assuming id=1 for singleton settings)
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        id: 1,
        default_role: defaultRole,
        message_template: messageTemplate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error saving settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal error saving settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
