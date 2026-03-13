import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

function isSafePath(filename: string): boolean {
  const resolved = path.resolve(TEMPLATES_DIR, filename);
  return resolved.startsWith(TEMPLATES_DIR + path.sep) || resolved === TEMPLATES_DIR;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');

    if (filename) {
      if (!isSafePath(filename)) {
        return NextResponse.json({ error: 'Nombre de archivo invalido' }, { status: 400 });
      }
      const filePath = path.join(TEMPLATES_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ content });
    } else {
      await fs.mkdir(TEMPLATES_DIR, { recursive: true });
      const files = await fs.readdir(TEMPLATES_DIR);
      const htmlFiles = files.filter(f => f.endsWith('.html'));
      return NextResponse.json({ templates: htmlFiles });
    }
  } catch (error: unknown) {
    const isNotFound = error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (isNotFound) {
      return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error leyendo templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filename, content } = await request.json();

    if (!filename || typeof filename !== 'string' || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Filename y content requeridos' }, { status: 400 });
    }

    if (!isSafePath(filename)) {
      return NextResponse.json({ error: 'Nombre de archivo invalido' }, { status: 400 });
    }

    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    const filePath = path.join(TEMPLATES_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, message: 'Template guardado' });
  } catch {
    return NextResponse.json({ error: 'Error guardando template' }, { status: 500 });
  }
}
