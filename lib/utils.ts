import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProgressPercentage(config: {
  action: string | null;
  testEmail: string;
  testMode: boolean;
  month: string;
  dataFile: File | null;
}): number {
  let completed = 0;
  
  if (config.action) completed += 25;
  if (config.testEmail || !config.testMode) completed += 25;
  if (config.month) completed += 25;
  if (config.dataFile) completed += 25;
  
  return completed;
}

export function generateConfigCode(config: {
  action: string | null;
  testMode: boolean;
  month: string;
}): string {
  if (!config.action) return 'SIN-CONFIG';
  
  const actionCode = 
    config.action === 'expensas' ? 'EXP' : 
    config.action === 'corte_luz' ? 'LUZ' : 'GEN';
  
  const modeCode = config.testMode ? 'TEST' : 'PROD';
  const monthCode = config.month ? config.month.substring(0, 3).toUpperCase() : 'MES';
  
  return `${actionCode}-${modeCode}-${monthCode}`;
}

export const MONTHS = [
  'Enero 2025',
  'Febrero 2025',
  'Marzo 2025',
  'Abril 2025',
  'Mayo 2025',
  'Junio 2025',
  'Julio 2025',
  'Agosto 2025',
  'Septiembre 2025',
  'Octubre 2025',
  'Noviembre 2025',
  'Diciembre 2025',
];