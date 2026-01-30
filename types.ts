
export enum OpportunityStatus {
  NEW = 'NEW',         // Identificado
  SENT = 'SENT',       // Contatado
  RESPONDED = 'RESPONDED', // Respondeu
  SCHEDULED = 'SCHEDULED', // Agendado
  ARCHIVED = 'ARCHIVED'   // Arquivado/Não interessado
}

export type ClinicalRecordType = 'consultation' | 'procedure' | 'exam' | 'prescription' | 'note';

export interface ClinicalRecord {
  id?: string;
  patientId?: string;
  date: string;
  description: string;
  type?: ClinicalRecordType;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  observations?: string;
  dentistName?: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  clinicName: string;
  avatarUrl?: string;
  role?: 'admin' | 'user'; // Role para controle de permissões
  tenantId?: string; // Multi-tenancy support
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  history?: string[]; // Tags/Keywords
  clinicalRecords?: ClinicalRecord[]; // Histórico detalhado com datas
  lastVisit?: string;
}

export interface Opportunity {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  keywordFound: string; // O termo que gerou a oportunidade (ex: "Diabetes")
  status: OpportunityStatus;
  createdAt: string;
  lastContact?: string;
  scheduledDate?: string; // Data e hora do agendamento
  notes?: string;
  clinicalRecords?: ClinicalRecord[]; // Trazido do paciente para visualização rápida
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  iconName: string;
}

export interface AppSettings {
  webhookUrl: string; // Webhook de Busca (Consulta Banco)
  messagingWebhookUrl?: string; // Webhook de Envio (Disparo Mensagem)
  apiKey?: string;
  messageTemplate?: string; // Template da mensagem de envio
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}
