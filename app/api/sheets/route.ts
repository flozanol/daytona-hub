import { NextResponse } from 'next/server';

const API_KEY = process.env.SHEETS_API_KEY ?? 'AIzaSyATBI8jMV1AtfsjhmwEwfOMYSdKmhMM5ck';
const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID ?? '1r3_CS8eu9MQz6Zwx0x95xwrHb-xSw1-R7m1aqsEAcQQ';
const SKIP = ['Resumen', 'Dashboard', 'Config', 'Data'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type KPIRow = Record<string, number | string>;

function parseSheet(values: string[][]): { kpis2025: KPIRow[]; kpis2026: KPIRow[] } {
  const headers = values[0].map(h => (h || '').trim());
  const kpiIdx = Math.max(0, headers.findIndex(h => /kpi|concepto/i.test(h)));
  const map25: Record<string, number> = {};
  const map26: Record<string, number> = {};

  headers.forEach((h, i) => {
    const m = MONTHS.find(mo => h.toLowerCase().startsWith(mo.substring(0, 3).toLowerCase()));
    if (m) {
      if (i >= 1 && i <= 12) map25[m] = i;
      else if (i >= 13 && i <= 24) map26[m] = i;
    }
  });

  const kpis2025: KPIRow[] = [];
  const kpis2026: KPIRow[] = [];

  values.slice(1).forEach(row => {
    if (!row[kpiIdx]) return;
    const o25: KPIRow = { name: row[kpiIdx].trim() };
    const o26: KPIRow = { name: row[kpiIdx].trim() };
    Object.entries(map25).forEach(([m, i]) => {
      const n = parseFloat(String(row[i] ?? '').replace(/[^0-9.-]+/g, ''));
      o25[m] = isNaN(n) ? 0 : n;
    });
    Object.entries(map26).forEach(([m, i]) => {
      const n = parseFloat(String(row[i] ?? '').replace(/[^0-9.-]+/g, ''));
      o26[m] = isNaN(n) ? 0 : n;
    });
    kpis2025.push(o25);
    kpis2026.push(o26);
  });

  return { kpis2025, kpis2026 };
}

export async function GET() {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`,
      { cache: 'no-store' }
    );
    const meta = await metaRes.json();

    if (!meta.sheets) {
      return NextResponse.json({ error: meta.error?.message ?? 'No sheets found' }, { status: 500 });
    }

    const sheetNames: string[] = meta.sheets
      .map((s: { properties: { title: string } }) => s.properties.title)
      .filter((t: string) => !SKIP.includes(t));

    const agencies = [];
    for (const name of sheetNames) {
      await new Promise(r => setTimeout(r, 100));
      const dataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(name + '!A:Z')}?key=${API_KEY}`,
        { cache: 'no-store' }
      );
      const json = await dataRes.json();
      if (json.values && json.values.length > 1) {
        agencies.push({ agency: name, ...parseSheet(json.values) });
      }
    }

    return NextResponse.json({ agencies });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
