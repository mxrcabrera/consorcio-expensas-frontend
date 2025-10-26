import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { pdfFolder, unidades } = await request.json();

    if (!pdfFolder || !unidades) {
      return NextResponse.json(
        { error: 'PDF folder y unidades requeridos' },
        { status: 400 }
      );
    }

    const validation: any[] = [];
    let totalPDFs = 0;

    for (const unidad of unidades) {
      const pdf1 = path.join(pdfFolder, `Expensas ${unidad}.pdf`);
      const pdf2 = path.join(pdfFolder, `Detalle expensas ${unidad}.pdf`);

      let exists1 = false;
      let exists2 = false;

      try {
        await fs.access(pdf1);
        exists1 = true;
        totalPDFs++;
      } catch {}

      try {
        await fs.access(pdf2);
        exists2 = true;
        totalPDFs++;
      } catch {}

      validation.push({
        unidad,
        expensas: exists1,
        detalle: exists2,
        completo: exists1 && exists2,
      });
    }

    return NextResponse.json({ validation, totalPDFs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error validando PDFs' },
      { status: 500 }
    );
  }
}