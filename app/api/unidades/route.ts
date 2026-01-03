import { NextRequest, NextResponse } from 'next/server';
import { getUnidadesByEdificio, upsertUnidades, getUnidadesCount } from '@/lib/db';

// GET /api/unidades?edificioId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get('edificioId');

    if (!edificioId) {
      return NextResponse.json({ success: false, error: 'edificioId requerido' }, { status: 400 });
    }

    const unidades = getUnidadesByEdificio(edificioId);
    return NextResponse.json({ success: true, data: unidades });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/unidades - Importar unidades desde Excel parseado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { edificioId, unidades } = body;

    if (!edificioId || !unidades || !Array.isArray(unidades)) {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
