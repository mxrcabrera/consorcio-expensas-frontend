import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo requerido' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempDir = path.join(process.cwd(), 'temp');
    await mkdir(tempDir, { recursive: true });

    const ext = file.name.split('.').pop()?.toLowerCase() || 'xlsx';
    const tempPath = path.join(tempDir, `file_${Date.now()}.${ext}`);
    await writeFile(tempPath, buffer);

    let data: Record<string, unknown>[] = [];
    let fileType = 'unknown';

    try {
      // Intentar leer como Excel/CSV
      const fileBuffer = await readFile(tempPath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

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
      // Si falla, intentar leer como texto plano (CSV mal formateado, TSV, etc)
      try {
        const textContent = buffer.toString('utf-8');
        const lines = textContent.split(/\r?\n/).filter(line => line.trim());

        if (lines.length > 0) {
          // Detectar delimitador
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
        // No se pudo parsear
      }
    }

    // Limpiar archivo temporal
    await unlink(tempPath);

    if (data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se pudieron extraer datos del archivo. Asegurate de que sea un Excel, CSV, o archivo de texto con datos tabulares.',
        data: [],
        totalRows: 0
      });
    }

    // Detectar columnas automáticamente
    const headers = Object.keys(data[0]);
    const sampleRows = data.slice(0, Math.min(10, data.length));
    const detectedColumns = detectColumns(headers, sampleRows);

    // Normalizar datos si detectamos columnas
    const normalizedData = normalizeData(data, detectedColumns);

    return NextResponse.json({
      success: true,
      data: normalizedData,
      totalRows: data.length,
      fileType,
      detectedColumns,
      originalHeaders: headers
    });
  } catch (error) {
    console.error('Error procesando archivo:', error);
    return NextResponse.json(
      { error: 'Error procesando archivo', details: String(error) },
      { status: 500 }
    );
  }
}