import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

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

    // Guardar temporalmente
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(process.cwd(), 'temp', `excel_${Date.now()}.xlsx`);
    await writeFile(tempPath, buffer);

    // Leer con XLSX
    const fileBuffer = await readFile(tempPath);
    const workbook = XLSX.read(fileBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Limpiar archivo temporal
    await unlink(tempPath);

    return NextResponse.json({
      success: true,
      data,
      totalRows: data.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error procesando Excel' },
      { status: 500 }
    );
  }
}