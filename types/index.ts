export type ActionType = 'expensas' | 'corte_luz' | 'avisos_generales' | null;

export interface ConfigState {
  action: ActionType;
  testMode: boolean;
  testEmail: string;
  testEmailCount: number; // 0 = todos, 1 = solo 1, 5 = solo 5
  dataFile: File | null;
  pdfFolder: string;
  month: string;
  subject?: string;
  diasCorte?: number;
}

export interface SendResult {
  success: boolean;
  sent: number;
  errors: number;
  message: string;
  details?: string[];
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

// Excel row data from parsed spreadsheet
export interface ExcelRow {
  N?: string | number;
  n?: string | number;
  Depto?: string;
  depto?: string;
  Nombre?: string;
  nombre?: string;
  Email?: string;
  email?: string;
  Unidad?: string;
  unidad?: string;
  [key: string]: string | number | null | undefined;
}