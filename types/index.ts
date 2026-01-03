export type ActionType = 'expensas' | 'corte_luz' | 'avisos_generales' | null;

export interface ConfigState {
  action: ActionType;
  testMode: boolean;
  testEmail: string;
  dataFile: File | null;
  pdfFolder: string;
  month: string;
  subject?: string;
  diasCorte?: number;
}

export interface ActionConfig {
  id: ActionType;
  icon: React.ComponentType<{ className?: string }>;
  code: string;
  title: string;
  description: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  attachments?: string[];
}

export interface SendResult {
  success: boolean;
  sent: number;
  errors: number;
  message: string;
  details?: string[];
}

export interface PDFValidation {
  valid: boolean;
  missing: string[];
  found: string[];
}

export interface Moroso {
  nombre: string;
  email: string;
  depto: string;
}

export interface Edificio {
  id: string;
  nombre: string;
  direccion: string | null;
  email_remitente: string | null;
  nombre_remitente: string;
  ruta_base: string;
  created_at: string;
  updated_at: string;
}