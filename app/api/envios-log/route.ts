import { NextRequest, NextResponse } from 'next/server';
import { getEnviosLogByEdificio, createEnvioLog } from '@/lib/db';

// GET /api/envios-log?edificioId=xxx&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edificioId = searchParams.get('edificioId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!edificioId) {
      return NextResponse.json({ success: false, error: 'edificioId requerido' }, { status: 400 });
    }

    const logs = getEnviosLogByEdificio(edificioId, limit);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/envios-log - Crear nuevo registro de envío
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { edificio_id, tipo_accion, total_enviados, total_errores, modo_test } = body;

    if (!edificio_id || !tipo_accion) {
      return NextResponse.json(
        { success: false, error: 'edificio_id y tipo_accion son requeridos' },
        { status: 400 }
      );
    }

    const log = createEnvioLog({
      edificio_id,
      tipo_accion,
      total_enviados: total_enviados || 0,
      total_errores: total_errores || 0,
      modo_test: modo_test || false,
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
