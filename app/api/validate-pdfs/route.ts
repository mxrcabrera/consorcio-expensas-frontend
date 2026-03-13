import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { pdfFolder, unidades } = await request.json();

    if (!pdfFolder || !Array.isArray(unidades)) {
      return NextResponse.json(
        { error: 'PDF folder y unidades (array) requeridos' },
        { status: 400 }
      );
    }

    const basePath = path.resolve(pdfFolder);

    const validation: { unidad: string; expensas: boolean; detalle: boolean; completo: boolean }[] = [];
    let totalPDFs = 0;

    for (const unidad of unidades) {
      const pdf1 = path.join(basePath, `Expensas ${unidad}.pdf`);
      const pdf2 = path.join(basePath, `Detalle expensas ${unidad}.pdf`);

      let exists1 = false;
      let exists2 = false;

      try {
        await fs.access(pdf1);
        exists1 = true;
        totalPDFs++;
      } catch { /* not found */ }

      try {
        await fs.access(pdf2);
        exists2 = true;
        totalPDFs++;
      } catch { /* not found */ }

      validation.push({
        unidad: String(unidad),
        expensas: exists1,
        detalle: exists2,
        completo: exists1 && exists2,
      });
    }

    return NextResponse.json({ validation, totalPDFs });
  } catch {
    return NextResponse.json({ error: 'Error validando PDFs' }, { status: 500 });
  }
}
