import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');

    if (filename) {
      // Leer un template específico
      const filePath = path.join(TEMPLATES_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ content });
    } else {
      // Listar todos los templates
      const files = await fs.readdir(TEMPLATES_DIR);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      return NextResponse.json({ templates: htmlFiles });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error leyendo templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filename, content } = await request.json();

    if (!filename || !content) {
      return NextResponse.json(
        { error: 'Filename y content requeridos' },
        { status: 400 }
      );
    }

    const filePath = path.join(TEMPLATES_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, message: 'Template guardado' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error guardando template' },
      { status: 500 }
    );
  }
}