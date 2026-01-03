import { NextRequest, NextResponse } from 'next/server';
import { getEdificioById, updateEdificio, deleteEdificio, getUnidadesCount } from '@/lib/db';

// GET /api/buildings/[id] - Obtener un edificio
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const edificio = getEdificioById(id);

    if (!edificio) {
      return NextResponse.json(
        { success: false, error: 'Edificio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: edificio });
  } catch (error) {
    console.error('Error fetching edificio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener edificio' },
      { status: 500 }
    );
  }
}

// PUT /api/buildings/[id] - Actualizar un edificio
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const edificio = updateEdificio(id, body);

    if (!edificio) {
      return NextResponse.json(
        { success: false, error: 'Edificio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: edificio });
  } catch (error) {
    console.error('Error updating edificio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar edificio' },
      { status: 500 }
    );
  }
}

// DELETE /api/buildings/[id] - Eliminar un edificio
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si tiene unidades
    const unidadesCount = getUnidadesCount(id);
    if (unidadesCount > 0) {
      return NextResponse.json(
        { success: false, error: `No se puede eliminar: tiene ${unidadesCount} unidades cargadas` },
        { status: 400 }
      );
    }

    const deleted = deleteEdificio(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Edificio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Edificio eliminado' });
  } catch (error) {
    console.error('Error deleting edificio:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar edificio' },
      { status: 500 }
    );
  }
}
