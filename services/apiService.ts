import {
  Opportunity, OpportunityStatus, Patient, User, Notification, AppSettings,
  Dentist, Appointment, AppointmentStatus, ScheduleConfig, ScheduleBlock, AvailableSlot,
} from '../types';

const normalizeApiBase = (raw?: string): string => {
  const value = (raw ?? '').trim();

  // Default to same-origin API routes
  if (!value) return '/api';

  // Relative paths are allowed (recommended: /api)
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api';

  // Absolute URL: if it doesn't include a path, assume it needs the /api prefix.
  try {
    const url = new URL(value);
    const pathname = (url.pathname || '').replace(/\/+$/, '');
    if (pathname === '' || pathname === '/') {
      url.pathname = '/api';
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    // Ignore parsing errors; fall back to trimmed value.
  }

  return value.replace(/\/+$/, '');
};

// Safe access to environment variables (works in both Vite and Next.js)
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const API_URL = normalizeApiBase(getEnvVar('NEXT_PUBLIC_API_URL'));

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, logout user
      localStorage.removeItem('auth_token');
      localStorage.removeItem('clinicaflow_user');
      window.location.href = '/';
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// --- Auth Functions ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
      }
      if (response.status === 404) {
        throw new Error('Usuário não encontrado. Verifique o email digitado.');
      }
      if (response.status === 500) {
        throw new Error('Erro no servidor. Tente novamente em alguns instantes.');
      }
      throw new Error(errorData.error || 'Erro ao fazer login. Tente novamente.');
    }

    const data = await response.json();

    // Store token and user
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('clinicaflow_user', JSON.stringify(data.user));

    return data.user;
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão ou se o servidor está disponível.');
    }
    throw error;
  }
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  clinicName: string
): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, clinicName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 400 && errorData.error === 'User already exists') {
        throw new Error('Este email já está cadastrado. Por favor, faça login ou use outro email.');
      }

      throw new Error(errorData.error || 'Erro ao criar conta');
    }

    const data = await response.json();

    // Store token and user
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('clinicaflow_user', JSON.stringify(data.user));

    return data.user;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao solicitar recuperação de senha');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Request password reset error:', error);
    const message = (error as any)?.message || '';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    throw error;
  }
};

export const resetPassword = async (
  email: string,
  resetToken: string,
  newPassword: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetToken, newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao redefinir senha');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Reset password error:', error);
    const message = (error as any)?.message || '';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    throw error;
  }
};

export const updateUserProfile = async (user: User): Promise<User> => {
  try {
    const updatedUser = await fetchWithAuth(`/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });

    localStorage.setItem('clinicaflow_user', JSON.stringify(updatedUser));
    return updatedUser;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('clinicaflow_user');
};

export const getStoredUser = (): User | null => {
  const stored = localStorage.getItem('clinicaflow_user');
  return stored ? JSON.parse(stored) : null;
};

// --- Patient Functions ---

export const getAllPatients = async (): Promise<Patient[]> => {
  try {
    return await fetchWithAuth('/patients');
  } catch (error) {
    console.error('Get patients error:', error);
    throw error;
  }
};

export const deleteAllPatients = async (): Promise<void> => {
  try {
    await fetchWithAuth('/patients', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Delete all patients error:', error);
    throw error;
  }
};

export const getPatientById = async (id: string): Promise<Patient> => {
  try {
    return await fetchWithAuth(`/patients/${id}`);
  } catch (error) {
    console.error('Get patient error:', error);
    throw error;
  }
};

export const createPatient = async (patient: Partial<Patient>): Promise<Patient> => {
  try {
    return await fetchWithAuth('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  } catch (error) {
    console.error('Create patient error:', error);
    throw error;
  }
};

// --- Opportunity Functions ---

export const getStoredOpportunities = (): Opportunity[] => {
  // Keep local storage for offline support
  const stored = localStorage.getItem('clinicaflow_opportunities');
  return stored ? JSON.parse(stored) : [];
};

const saveOpportunitiesLocal = (opportunities: Opportunity[]) => {
  localStorage.setItem('clinicaflow_opportunities', JSON.stringify(opportunities));
};

export const getAllOpportunities = async (): Promise<Opportunity[]> => {
  try {
    const opportunities = await fetchWithAuth('/opportunities');
    saveOpportunitiesLocal(opportunities);
    return opportunities;
  } catch (error) {
    console.error('Get opportunities error:', error);
    // Fallback to local storage
    return getStoredOpportunities();
  }
};

export const searchPatientsByKeyword = async (
  keyword: string,
  limit: number = 10
): Promise<Opportunity[]> => {
  try {
    const opportunities = await fetchWithAuth('/opportunities/search', {
      method: 'POST',
      body: JSON.stringify({ keyword, limit }),
    });

    // Merge with local storage
    const existing = getStoredOpportunities();
    const merged = mergeNewOpportunities(existing, opportunities);
    return opportunities;
  } catch (error) {
    console.error('Search patients error:', error);
    throw error;
  }
};

export const updateOpportunityStatus = async (
  oppId: string,
  newStatus: OpportunityStatus,
  scheduledDate?: string
): Promise<void> => {
  try {
    await fetchWithAuth(`/opportunities/${oppId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus, scheduledDate }),
    });

    // Update local storage
    const current = getStoredOpportunities();
    const updated = current.map(o =>
      o.id === oppId
        ? {
          ...o,
          status: newStatus,
          lastContact: new Date().toISOString(),
          ...(scheduledDate ? { scheduledDate } : {}),
        }
        : o
    );
    saveOpportunitiesLocal(updated);
  } catch (error) {
    console.error('Update opportunity status error:', error);
    throw error;
  }
};

export const updateOpportunityNotes = async (oppId: string, notes: string): Promise<void> => {
  try {
    await fetchWithAuth(`/opportunities/${oppId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });

    // Update local storage
    const current = getStoredOpportunities();
    const updated = current.map(o => (o.id === oppId ? { ...o, notes } : o));

    saveOpportunitiesLocal(updated);
  } catch (error) {
    console.error('Update opportunity notes error:', error);
    throw error;
  }
};

export const createOpportunity = async (opportunity: Partial<Opportunity>): Promise<Opportunity> => {
  try {
    const newOpportunity = await fetchWithAuth('/opportunities', {
      method: 'POST',
      body: JSON.stringify(opportunity),
    });

    // Update local storage
    const current = getStoredOpportunities();
    const updated = mergeNewOpportunities(current, [newOpportunity]);
    saveOpportunitiesLocal(updated);

    return newOpportunity;
  } catch (error) {
    console.error('Create opportunity error:', error);
    throw error;
  }
};

export const mergeNewOpportunities = (
  existing: Opportunity[],
  incoming: Opportunity[]
): Opportunity[] => {
  const existingPatientIds = new Set(existing.map(e => e.patientId));
  const uniqueIncoming = incoming.filter(i => !existingPatientIds.has(i.patientId));
  const updated = [...uniqueIncoming, ...existing];
  saveOpportunitiesLocal(updated);
  return updated;
};

export const deleteAllOpportunities = async (): Promise<void> => {
  try {
    await fetchWithAuth('/opportunities', {
      method: 'DELETE',
    });

    // Clear local storage
    localStorage.removeItem('clinicaflow_opportunities');
  } catch (error) {
    console.error('Delete all opportunities error:', error);
    throw error;
  }
};

export const deleteOpportunity = async (oppId: string): Promise<void> => {
  try {
    await fetchWithAuth(`/opportunities/${oppId}`, {
      method: 'DELETE',
    });

    // Update local storage
    const current = getStoredOpportunities();
    const updated = current.filter(o => o.id !== oppId);
    saveOpportunitiesLocal(updated);
  } catch (error) {
    console.error('Delete opportunity error:', error);
    throw error;
  }
};

// --- Notification Functions ---

export const getMockNotifications = async (): Promise<Notification[]> => {
  try {
    return await fetchWithAuth('/notifications');
  } catch (error) {
    console.error('Get notifications error:', error);
    // Fallback to mock data
    return [
      {
        id: 'n1',
        title: 'Paciente Identificado',
        message: 'O sistema encontrou um paciente potencial para "Implante".',
        type: 'success',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await fetchWithAuth(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
  }
};

// --- Settings Functions ---

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const settings = await fetchWithAuth('/settings');
    localStorage.setItem('clinicaflow_settings', JSON.stringify(settings));
    return settings;
  } catch (error) {
    console.error('Get settings error:', error);
    // Fallback to local storage
    const stored = localStorage.getItem('clinicaflow_settings');
    return stored ? JSON.parse(stored) : { webhookUrl: '' };
  }
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  try {
    // Merge with existing settings to ensure we have all required fields
    const existingSettings = await getSettings();
    const mergedSettings = { ...existingSettings, ...settings };

    await fetchWithAuth('/settings', {
      method: 'POST',
      body: JSON.stringify(mergedSettings),
    });
    localStorage.setItem('clinicaflow_settings', JSON.stringify(mergedSettings));
  } catch (error) {
    console.error('Save settings error:', error);
    throw error;
  }
};

// --- Messaging Functions ---

export const sendMessageToPatient = async (opportunity: Opportunity): Promise<boolean> => {
  try {
    const settings = await getSettings();
    const defaultTemplate =
      'Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?';

    let message =
      settings.messageTemplate && settings.messageTemplate.trim() !== ''
        ? settings.messageTemplate
        : defaultTemplate;

    message = message.replace(/{name}/g, opportunity.name);
    message = message.replace(/{keyword}/g, opportunity.keywordFound);

    if (settings.messagingWebhookUrl && settings.messagingWebhookUrl.startsWith('http')) {
      const response = await fetch(settings.messagingWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
          action: 'send_message',
          patient_id: opportunity.patientId,
          phone: opportunity.phone,
          name: opportunity.name,
          message_body: message,
          source: 'AlloOralClinic_Frontend',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Erro no envio: ${response.status}`);
      return true;
    }

    // Fallback to WhatsApp Web
    const url = `https://wa.me/${opportunity.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    return true;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

// --- Import Functions ---

export const importPatientsFromFile = async (patients: any[]): Promise<{
  success: boolean;
  message: string;
  imported: number;
  total: number;
}> => {
  try {
    const result = await fetchWithAuth('/patients/import', {
      method: 'POST',
      body: JSON.stringify({ patients }),
    });

    return result;
  } catch (error) {
    console.error('Import patients error:', error);
    throw error;
  }
};

// --- Dentist Functions ---

export const getDentists = async (activeOnly = true): Promise<Dentist[]> => {
  const params = activeOnly ? '' : '?active=false';
  const data = await fetchWithAuth(`/dentists${params}`);
  return data.dentists ?? [];
};

export const createDentist = async (dentist: Partial<Dentist>): Promise<Dentist> => {
  const data = await fetchWithAuth('/dentists', {
    method: 'POST',
    body: JSON.stringify(dentist),
  });
  return data.dentist;
};

export const updateDentist = async (id: string, updates: Partial<Dentist>): Promise<Dentist> => {
  const data = await fetchWithAuth(`/dentists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.dentist;
};

// --- Schedule Config Functions ---

export const getScheduleConfig = async (dentistId: string): Promise<ScheduleConfig[]> => {
  const data = await fetchWithAuth(`/dentists/${dentistId}/schedule`);
  return data.schedule ?? [];
};

export const saveScheduleConfig = async (dentistId: string, configs: Partial<ScheduleConfig>[]): Promise<ScheduleConfig[]> => {
  const data = await fetchWithAuth(`/dentists/${dentistId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ days: configs }),
  });
  return data.schedule ?? [];
};

// --- Appointment Functions ---

export const getAppointments = async (params: {
  from?: string;
  to?: string;
  dentist_id?: string;
  status?: AppointmentStatus;
  patient_id?: string;
}): Promise<Appointment[]> => {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.dentist_id) searchParams.set('dentist_id', params.dentist_id);
  if (params.status) searchParams.set('status', params.status);
  if (params.patient_id) searchParams.set('patient_id', params.patient_id);

  const data = await fetchWithAuth(`/appointments?${searchParams}`);
  return data.appointments ?? [];
};

export const createAppointment = async (appointment: {
  patient_id: string;
  dentist_id: string;
  start_time: string;
  end_time: string;
  procedure?: string;
  notes?: string;
  source?: string;
}): Promise<Appointment> => {
  const data = await fetchWithAuth('/appointments', {
    method: 'POST',
    body: JSON.stringify(appointment),
  });
  return data.appointment;
};

export const updateAppointment = async (id: string, updates: Partial<Appointment> & { cancellation_reason?: string }): Promise<Appointment> => {
  const data = await fetchWithAuth(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.appointment;
};

export const cancelAppointment = async (id: string, reason?: string): Promise<void> => {
  await fetchWithAuth(`/appointments/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: reason || 'Cancelado pelo usuário' }),
  });
};

export const getAvailableSlots = async (dentistId: string, date: string, durationMinutes?: number): Promise<AvailableSlot[]> => {
  const params = new URLSearchParams({ dentist_id: dentistId, date });
  if (durationMinutes) params.set('duration_minutes', String(durationMinutes));
  const data = await fetchWithAuth(`/appointments/available-slots?${params}`);
  return data.slots ?? [];
};

// --- Schedule Block Functions ---

export const getScheduleBlocks = async (from?: string, to?: string): Promise<ScheduleBlock[]> => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const data = await fetchWithAuth(`/schedule-blocks?${params}`);
  return data.blocks ?? [];
};

export const createScheduleBlock = async (block: {
  dentist_id?: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
}): Promise<ScheduleBlock> => {
  const data = await fetchWithAuth('/schedule-blocks', {
    method: 'POST',
    body: JSON.stringify(block),
  });
  return data.block;
};

// --- Message Template Functions ---

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export const getMessageTemplates = async (): Promise<MessageTemplate[]> => {
  return await fetchWithAuth('/templates');
};

export const createMessageTemplate = async (template: {
  name: string;
  content: string;
  type?: string;
}): Promise<MessageTemplate> => {
  return await fetchWithAuth('/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
};

export const updateMessageTemplate = async (
  id: string,
  updates: { name?: string; content?: string; type?: string }
): Promise<MessageTemplate> => {
  return await fetchWithAuth(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};

export const deleteMessageTemplate = async (id: string): Promise<void> => {
  await fetchWithAuth(`/templates/${id}`, { method: 'DELETE' });
};

