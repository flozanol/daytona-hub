import { NextResponse } from 'next/server';
import { getSeminuevos } from '../../lib/db_seminuevos';

export async function GET() {
    try {
        const data = await getSeminuevos();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener seminuevos' }, { status: 500 });
    }
}