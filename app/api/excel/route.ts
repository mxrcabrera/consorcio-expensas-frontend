import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir, access } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

const DATA_DIR = path.join(process.cwd(), 'data');

function getSavedExcelPath(edificioId: string): string {
  return path.join(DATA_DIR, edificioId, 'datos_maestro.xlsx');
}

// Patrones para detectar columnas automáticamente
const COLUMN_PATTERNS = {
  email: {
    headers: ['email', 'mail', 'correo', 'e-mail', 'e_mail', 'email_propietario', 'email_inquilino'],
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  nombre: {
    headers: ['nombre', 'propietario', 'titular', 'name', 'apellido', 'razon_social'],
    regex: /^[a-záéíóúñ\s]{3,50}$/i
  },
  depto: {
    headers: ['depto', 'dpto', 'departamento', 'unidad', 'uf', 'piso', 'puerta'],
    regex: /^(\d{1,2}[°º]?\s?[a-z]?|pb|planta baja|[a-z]{1,2})$/i
  },
  numero: {
    headers: ['n', 'id', 'numero', 'nro', '#', 'num', 'orden'],
    regex: /^\d{1,4}$/
  },
  telefono: {
    headers: ['telefono', 'tel', 'celular', 'phone', 'whatsapp', 'movil'],
    regex: /^[\d\s\-\+\(\)]{7,20}$/
  }
};

interface DetectedColumns {
  email: string | null;
  nombre: string | null;
  depto: string | null;
  numero: string | null;
  telefono: string | null;
  confidence: number;
}

function detectColumns(headers: string[], sampleRows: Record<string, unknown>[]): DetectedColumns {
  const detected: DetectedColumns = {
    email: null,
    nombre: null,
    depto: null,
    numero: null,
    telefono: null,
    confidence: 0
  };

  let matchedCount = 0;

  // Paso 1: Detectar por nombre de header
  for (const [colType, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\-\s]/g, '');

      if (patterns.headers.some(p => normalizedHeader.includes(p.replace(/[_\-\s]/g, '')))) {
        if (!detected[colType as keyof Omit<DetectedColumns, 'confidence'>]) {
          detected[colType as keyof Omit<DetectedColumns, 'confidence'>] = header;
          matchedCount++;
        }
      }
    }
  }

  // Paso 2: Detectar por contenido (para columnas no encontradas por header)
  for (const [colType, patterns] of Object.entries(COLUMN_PATTERNS)) {
    if (detected[colType as keyof Omit<DetectedColumns, 'confidence'>]) continue;

    for (const header of headers) {
      const values = sampleRows
        .map(row => row[header])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '');

      if (values.length === 0) continue;

      const matchRate = values.filter(v => patterns.regex.test(String(v).trim())).length / values.length;

      // Si más del 60% de los valores coinciden con el patrón
      if (matchRate > 0.6) {
        detected[colType as keyof Omit<DetectedColumns, 'confidence'>] = header;
        matchedCount++;
        break;
      }
    }
  }

  // Calcular confianza basada en cuántas columnas detectamos
  detected.confidence = Math.round((matchedCount / Object.keys(COLUMN_PATTERNS).length) * 100);

  return detected;
}

function normalizeData(
  data: Record<string, unknown>[],
  detected: DetectedColumns
): Record<string, unknown>[] {
  // Si no detectamos columnas importantes, devolver datos tal cual
  if (!detected.email && !detected.nombre) {
    return data;
  }

  return data.map(row => {
    const normalized: Record<string, unknown> = {};

    // Mapear columnas detectadas a nombres estándar
    if (detected.depto && row[detected.depto] !== undefined) {
      normalized['Depto'] = row[detected.depto];
    }
    if (detected.numero && row[detected.numero] !== undefined) {
      normalized['N'] = row[detected.numero];
    }
    if (detected.nombre && row[detected.nombre] !== undefined) {
      normalized['Nombre'] = row[detected.nombre];
    }
    if (detected.email && row[detected.email] !== undefined) {
      normalized['Email'] = row[detected.email];
    }
    if (detected.telefono && row[detected.telefono] !== undefined) {
      normalized['Telefono'] = row[detected.telefono];
    }

    // Agregar columnas no mapeadas
    for (const [key, value] of Object.entries(row)) {
      const isAlreadyMapped = Object.values(detected)
        .filter(v => typeof v === 'string')
        .includes(key);

      if (!isAlreadyMapped) {
        normalized[key] = value;
      }
    }

    return normalized;
  });
}

function parseExcelBuffer(buffer: Buffer, ext: string): { data: Record<string, unknown>[]; fileType: string } {
  let data: Record<string, unknown>[] = [];
  let fileType = 'unknown';

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    if (workbook.SheetNames.length > 0) {
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      data = XLSX.utils.sheet_to_json(worksheet, {
        defval: null,
        raw: false
      }) as Record<string, unknown>[];

      fileType = ext === 'csv' ? 'csv' : 'excel';
    }
  } catch {
    try {
      const textContent = buffer.toString('utf-8');
      const lines = textContent.split(/\r?\n/).filter(line => line.trim());

      if (lines.length > 0) {
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' :
                         firstLine.includes(';') ? ';' : ',';

        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

        data = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || null;
          });
          return row;
        });

        fileType = 'text';
      }
    } catch {
      // Could not parse
    }
  }

  return { data, fileType };
}

function buildResponse(data: Record<string, unknown>[], fileType: string) {
  if (data.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No se pudieron extraer datos del archivo.',
      data: [],
      totalRows: 0
    });
  }

  const headers = Object.keys(data[0]);
  const sampleRows = data.slice(0, Math.min(10, data.length));
  const detectedColumns = detectColumns(headers, sampleRows);
  const normalizedData = normalizeData(data, detectedColumns);

  return NextResponse.json({
    success: true,
    data: normalizedData,
    totalRows: data.length,
    fileType,
    detectedColumns,
    originalHeaders: headers
  });
}

// Load saved Excel for a building
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get('edificioId');

    if (!edificioId) {
      return NextResponse.json({ error: 'edificioId requerido' }, { status: 400 });
    }

    const savedPath = getSavedExcelPath(edificioId);

    try {
      await access(savedPath);
    } catch {
      return NextResponse.json({ success: true, data: [], totalRows: 0, saved: false });
    }

    const buffer = await readFile(savedPath);
    const { data, fileType } = parseExcelBuffer(buffer, 'xlsx');
    const response = buildResponse(data, fileType);
    const body = await response.json();
    return NextResponse.json({ ...body, saved: true });
  } catch (error) {
    console.error('Error loading saved Excel:', error);
    return NextResponse.json({ error: 'Error cargando datos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const edificioId = formData.get('edificioId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'xlsx';
    const { data, fileType } = parseExcelBuffer(buffer, ext);

    // Persist the file per building
    if (edificioId && data.length > 0) {
      const savedPath = getSavedExcelPath(edificioId);
      await mkdir(path.dirname(savedPath), { recursive: true });
      await writeFile(savedPath, buffer);
    }

    return buildResponse(data, fileType);
  } catch (error) {
    console.error('Error procesando archivo:', error);
    return NextResponse.json(
      { error: 'Error procesando archivo', details: String(error) },
      { status: 500 }
    );
  }
}