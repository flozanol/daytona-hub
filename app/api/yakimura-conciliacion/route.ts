import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';
import { getVentasYakimura } from '@/app/lib/db_ventas';
const quantity = (r:any) => Number(r.QtyAD??0)+Number(r.QtyAF??0)+Number(r.QtyAP??0)+Number(r.QtyDP??0);
const norm = (v:unknown) => String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
export async function GET() { try {
 const [inventoryRows,salesRows] = await Promise.all([getInventory(),getVentasYakimura()]);
 const inventory=(Array.isArray(inventoryRows)?inventoryRows:[]).filter((r:any)=>/matriz|clinica|tecamachalco/i.test(String(r.Ubicacion??'')));
 const sales=Array.isArray(salesRows)?salesRows:[];
 const salesKeys=new Set(sales.filter((r:any)=>Number(r.Periodo_Menos_3??0)+Number(r.Periodo_Menos_2??0)+Number(r.Periodo_Menos_1??0)+Number(r.Periodo_Actual??0)>0).map((r:any)=>[norm(r.CpnyId),norm(r.SubMarca),Number(r.Anio),norm(r.Color)].join('|')));
 const matched=inventory.filter((r:any)=>salesKeys.has([norm(r.CpnyID),norm(r.Modelo),Number(r.ModelYr??r.Anio),norm(r.Color)].join('|')));
 const unmatched=inventory.filter((r:any)=>!salesKeys.has([norm(r.CpnyID),norm(r.Modelo),Number(r.ModelYr??r.Anio),norm(r.Color)].join('|')));
 const sum=(rs:any[])=>rs.reduce((n,r)=>n+quantity(r),0);
 return NextResponse.json({ventasConInventario:matched,inventarioSinHistorico:unmatched,resumen:{totalClinica:sum(inventory),emparejado:sum(matched),sinHistorico:sum(unmatched),financiados:inventory.filter((r:any)=>/financiadas/i.test(String(r.Ubicacion??''))).length,propios:inventory.filter((r:any)=>/propia|matriz/i.test(String(r.Ubicacion??''))).length,demos:inventory.filter((r:any)=>/demo/i.test(String(r.Modelo??''))).length,demosPropios:inventory.filter((r:any)=>/demo/i.test(String(r.Modelo??''))&&/propia|matriz/i.test(String(r.Ubicacion??''))).length}});
 } catch(error) { console.error('Error en conciliacion Yakimura:',error); return NextResponse.json({error:'Error al obtener conciliacion',details:error instanceof Error?error.message:String(error)},{status:500}); } }
