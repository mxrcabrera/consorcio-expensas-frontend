import { NextRequest, NextResponse } from 'next/server';
import { getUnidadesByEdificio, upsertUnidades, getUnidadesCount } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get('edificioId');

    if (!edificioId) {
      return NextResponse.json({ success: false, error: 'edificioId requerido' }, { status: 400 });
    }

    const unidades = getUnidadesByEdificio(edificioId);
    return NextResponse.json({ success: true, data: unidades });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { edificioId, unidades } = body;

    if (!edificioId || !Array.isArray(unidades)) {
      return NextResponse.json(
        { success: false, error: 'edificioId y unidades son requeridos' },
        { status: 400 }
      );
    }

    upsertUnidades(edificioId, unidades);
    const count = getUnidadesCount(edificioId);

    return NextResponse.json({
      success: true,
      message: `${count} unidades importadas correctamente`,
      count,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
