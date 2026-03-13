import { NextRequest, NextResponse } from 'next/server';
import { getAllEdificios, createEdificio } from '@/lib/db';
import path from 'path';

export async function GET() {
  try {
    const edificios = getAllEdificios();
    return NextResponse.json({ success: true, data: edificios });
  } catch (error) {
    console.error('Error fetching edificios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener edificios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, direccion, email_remitente, nombre_remitente } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre_remitente || typeof nombre_remitente !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nombre y nombre del remitente son requeridos' },
        { status: 400 }
      );
    }

    const id = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);

    const ruta_base = path.join(process.cwd(), 'edificios', id);

    const edificio = createEdificio({
      id,
      nombre,
      direccion: direccion || null,
      email_remitente: email_remitente || null,
      nombre_remitente,
      ruta_base,
    });

    return NextResponse.json({ success: true, data: edificio });
  } catch (error) {
    console.error('Error creating edificio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear edificio' },
      { status: 500 }
    );
  }
}
