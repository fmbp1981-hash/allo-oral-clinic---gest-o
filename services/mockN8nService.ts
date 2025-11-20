import { Opportunity, OpportunityStatus, Patient, AppSettings, ClinicalRecord, User, Notification } from '../types';

// Mock Database simulando o NEON DB com contexto ODONTOLÓGICO (Allo Oral Clinic)
const MOCK_PATIENTS_DB: Patient[] = [
  { 
    id: 'p1', 
    name: 'Ana Silva', 
    phone: '5511999999999', 
    history: ['implante', 'protocolo', 'manutenção'], 
    lastVisit: '2023-12-01',
    clinicalRecords: [
      { date: '2023-12-01', description: 'Manutenção protocolo inferior e limpeza', type: 'procedure' },
      { date: '2023-06-15', description: 'Avaliação pós-cirúrgica implante', type: 'consultation' },
      { date: '2023-01-10', description: 'Instalação de implante dente 36 e 46', type: 'surgery' }
    ]
  },
  { 
    id: 'p2', 
    name: 'Carlos Oliveira', 
    phone: '5511988888888', 
    history: ['ortodontia', 'aparelho fixo', 'manutenção'], 
    lastVisit: '2024-01-15',
    clinicalRecords: [
      { date: '2024-01-15', description: 'Manutenção ortodôntica - Troca de fio superior', type: 'procedure' },
      { date: '2023-12-10', description: 'Manutenção ortodôntica - Colagem braquete solto', type: 'procedure' },
      { date: '2023-11-05', description: 'Documentação ortodôntica completa', type: 'exam' }
    ]
  },
  { 
    id: 'p3', 
    name: 'Mariana Santos', 
    phone: '5511977777777', 
    history: ['estética', 'lentes de contato', 'clareamento'], 
    lastVisit: '2024-02-20',
    clinicalRecords: [
      { date: '2024-02-20', description: 'Sessão de clareamento de consultório (3ª sessão)', type: 'procedure' },
      { date: '2024-02-05', description: 'Sessão de clareamento de consultório (2ª sessão)', type: 'procedure' },
      { date: '2024-01-20', description: 'Profilaxia e moldagem para lentes', type: 'procedure' }
    ]
  },
  { 
    id: 'p4', 
    name: 'Roberto Costa', 
    phone: '5511966666666', 
    history: ['periodontia', 'limpeza', 'gengivite'], 
    lastVisit: '2023-11-10',
    clinicalRecords: [
      { date: '2023-11-10', description: 'Raspagem supra e subgengival quadrante 1 e 2', type: 'procedure' },
      { date: '2023-11-03', description: 'Consulta inicial periodontia - Sondagem completa', type: 'consultation' }
    ]
  },
  { 
    id: 'p5', 
    name: 'Fernanda Lima', 
    phone: '5511955555555', 
    history: ['odontopediatria', 'prevenção', 'flúor'], 
    lastVisit: '2024-03-01',
    clinicalRecords: [
      { date: '2024-03-01', description: 'Aplicação tópica de flúor e orientação de higiene', type: 'procedure' },
      { date: '2023-08-15', description: 'Restauração oclusal dente 55 (ionômero)', type: 'procedure' }
    ]
  },
  { 
    id: 'p6', 
    name: 'Paulo Souza', 
    phone: '5511944444444', 
    history: ['endodontia', 'canal', 'dor de dente'], 
    lastVisit: '2023-10-05',
    clinicalRecords: [
      { date: '2023-10-05', description: 'Obturação canal dente 26', type: 'procedure' },
      { date: '2023-09-28', description: 'Instrumentação rotatória dente 26', type: 'procedure' },
      { date: '2023-09-25', description: 'Abertura coronária dente 26 - Urgência', type: 'procedure' }
    ]
  },
  { 
    id: 'p7', 
    name: 'Lucia Mendes', 
    phone: '5511933333333', 
    history: ['estética', 'harmonização', 'botox'], 
    lastVisit: '2024-01-25',
    clinicalRecords: [
      { date: '2024-01-25', description: 'Aplicação Toxina Botulínica (Terço superior)', type: 'procedure' },
      { date: '2023-07-20', description: 'Preenchimento labial (1ml)', type: 'procedure' }
    ]
  },
  { 
    id: 'p8', 
    name: 'Ricardo Alves', 
    phone: '5511922222222', 
    history: ['cirurgia', 'siso', 'extração'], 
    lastVisit: '2024-02-10',
    clinicalRecords: [
      { date: '2024-02-10', description: 'Remoção de sutura', type: 'consultation' },
      { date: '2024-02-03', description: 'Exodontia incluso dente 38 e 48', type: 'surgery' },
      { date: '2024-01-25', description: 'Avaliação tomografia para sisos', type: 'consultation' }
    ]
  },
];

const STORAGE_KEY = 'clinicaflow_opportunities';
const SETTINGS_KEY = 'clinicaflow_settings';
const USER_KEY = 'clinicaflow_user';

// --- Auth Functions ---

export const loginUser = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password) {
        const namePart = email.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        
        const user: User = {
          id: 'u1',
          name: formattedName, 
          email: email,
          clinicName: 'Allo Oral Clinic',
          avatarUrl: `https://ui-avatars.com/api/?name=${formattedName}&background=0D8ABC&color=fff`
        };
        
        // Se já existir um user salvo, tenta mesclar para não perder dados editados
        const existing = localStorage.getItem(USER_KEY);
        if (existing) {
            const parsed = JSON.parse(existing);
            if (parsed.email === email) {
                resolve(parsed);
                return;
            }
        }

        localStorage.setItem(USER_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error("Credenciais inválidas"));
      }
    }, 1000);
  });
};

export const registerUser = (name: string, email: string, password: string, clinicName: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (name && email && password && clinicName) {
        const user: User = {
          id: `u_${Date.now()}`,
          name: name,
          email: email,
          clinicName: clinicName,
          avatarUrl: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=0D8ABC&color=fff`
        };
        
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error("Por favor, preencha todos os campos."));
      }
    }, 1500);
  });
};

export const updateUserProfile = (user: User): Promise<User> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            resolve(user);
        }, 800);
    });
};

export const resetPassword = (email: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email.includes('@')) {
        resolve(); // Simula sucesso no envio
      } else {
        reject(new Error("Email inválido."));
      }
    }, 1000);
  });
};

export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- Notification Mock ---

export const getMockNotifications = (): Promise<Notification[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                {
                    id: 'n1',
                    title: 'Paciente Identificado',
                    message: 'O sistema encontrou um paciente potencial para "Implante".',
                    type: 'success',
                    read: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'n2',
                    title: 'Meta Atingida',
                    message: 'Você atingiu 10 agendamentos este mês! Parabéns.',
                    type: 'info',
                    read: true,
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                 {
                    id: 'n3',
                    title: 'Lembrete de Reativação',
                    message: 'Paciente Carlos Oliveira aguarda retorno sobre tratamento.',
                    type: 'warning',
                    read: false,
                    createdAt: new Date(Date.now() - 3600000).toISOString()
                }
            ]);
        }, 500);
    });
};


// --- Existing Functions ---

export const getStoredOpportunities = (): Opportunity[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveOpportunities = (opps: Opportunity[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opps));
};

export const getSettings = (): AppSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? JSON.parse(stored) : { webhookUrl: '' };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getAllPatientsMock = (): Promise<Patient[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_PATIENTS_DB), 800);
  });
}

export const sendMessageToPatient = async (opportunity: Opportunity): Promise<boolean> => {
  const settings = getSettings();
  const defaultTemplate = 'Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?';
  let message = settings.messageTemplate && settings.messageTemplate.trim() !== '' 
    ? settings.messageTemplate 
    : defaultTemplate;

  message = message.replace(/{name}/g, opportunity.name);
  message = message.replace(/{keyword}/g, opportunity.keywordFound);

  if (settings.messagingWebhookUrl && settings.messagingWebhookUrl.startsWith('http')) {
    try {
      console.log(`Enviando mensagem via Webhook: ${settings.messagingWebhookUrl}`);
      const response = await fetch(settings.messagingWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify({ 
          action: 'send_message',
          patient_id: opportunity.patientId,
          phone: opportunity.phone,
          name: opportunity.name,
          message_body: message,
          source: 'AlloOralClinic_Frontend',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error(`Erro no envio: ${response.status}`);
      return true;
    } catch (error) {
      console.error("Falha no Webhook de Mensagem:", error);
      throw error;
    }
  }

  const url = `https://wa.me/${opportunity.phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
};

export const searchPatientsByKeyword = async (keyword: string, limit: number = 10): Promise<Opportunity[]> => {
  const settings = getSettings();
  
  if (settings.webhookUrl && settings.webhookUrl.startsWith('http')) {
    try {
      console.log(`Iniciando busca via Webhook: ${settings.webhookUrl} (Limit: ${limit})`);
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify({ 
          keyword: keyword,
          limit: limit,
          source: 'AlloOralClinic_Frontend',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

      const data = await response.json();
      let patientsFound: any[] = [];
      
      if (Array.isArray(data)) {
        patientsFound = data;
      } else if (data.results && Array.isArray(data.results)) {
        patientsFound = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        patientsFound = data.data;
      }

      return patientsFound.map((p: any) => ({
        id: `opp_${Date.now()}_${p.id || Math.random()}`,
        patientId: p.id || 'external',
        name: p.name || 'Paciente Desconhecido',
        phone: p.phone || '',
        keywordFound: keyword,
        status: OpportunityStatus.NEW,
        createdAt: new Date().toISOString(),
        clinicalRecords: p.clinicalRecords || []
      }));

    } catch (error) {
      console.warn("Falha no Webhook, usando fallback local:", error);
    }
  }

  // Fallback Mock
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedKeyword = keyword.toLowerCase().trim();
      const matchingPatients = MOCK_PATIENTS_DB.filter(p => 
        p.history?.some(h => h.includes(normalizedKeyword))
      );
      const limitedPatients = matchingPatients.slice(0, limit);
      const newOpps: Opportunity[] = limitedPatients.map(p => ({
        id: `opp_${Date.now()}_${p.id}`,
        patientId: p.id,
        name: p.name,
        phone: p.phone,
        keywordFound: keyword,
        status: OpportunityStatus.NEW,
        createdAt: new Date().toISOString(),
        clinicalRecords: p.clinicalRecords
      }));
      resolve(newOpps);
    }, 1500);
  });
};

// Atualiza status e, opcionalmente, a data de agendamento
export const updateOpportunityStatus = async (oppId: string, newStatus: OpportunityStatus, scheduledDate?: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const current = getStoredOpportunities();
      const updated = current.map(l => {
        if (l.id === oppId) {
            return { 
                ...l, 
                status: newStatus, 
                lastContact: new Date().toISOString(),
                ...(scheduledDate ? { scheduledDate } : {}) // Salva data se fornecida
            };
        }
        return l;
      });
      saveOpportunities(updated);
      resolve();
    }, 400);
  });
};

export const updateOpportunityNotes = async (oppId: string, notes: string): Promise<void> => {
  return new Promise((resolve) => {
    const current = getStoredOpportunities();
    const updated = current.map(l => 
      l.id === oppId ? { ...l, notes: notes } : l
    );
    saveOpportunities(updated);
    resolve();
  });
};

export const mergeNewOpportunities = (existing: Opportunity[], incoming: Opportunity[]): Opportunity[] => {
  const existingPatientIds = new Set(existing.map(e => e.patientId));
  const uniqueIncoming = incoming.filter(i => !existingPatientIds.has(i.patientId));
  const updated = [...uniqueIncoming, ...existing];
  saveOpportunities(updated);
  return updated;
};