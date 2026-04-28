import { NextResponse } from 'next/server';
import { getSeminuevos } from '../../lib/db_seminuevos';

export async function GET() {
    try {
        const data = await getSeminuevos();
        return NextResponse.json(data);
    } catch (error: any) {
        // CAMBIO: Ahora nos devolverá el error real para saber qué columna corregir
        return NextResponse.json({ 
            error: 'Error en SQL', 
            details: error.message 
        }, { status: 500 });
    }
}