#!/usr/bin/env python3
"""
Grupo Daytona - Dashboard de Marketing
Pipeline de limpieza, estandarizacion y consolidacion de reportes de leads.

USO:
    python3 scripts/build.py

Lee todos los CSV dentro de data_raw/<AAAA-MM>/ (uno por agencia, formato
"ReporteFuentes..." exportado del CRM), los limpia y estandariza usando los
mapeos editables en data_raw/mapeos/, actualiza el historico acumulado en
data_raw/processed/leads_historico.csv, y regenera docs/data/dashboard_data.json
(lo que consume el sitio).

Para agregar un mes nuevo: crea la carpeta data_raw/AAAA-MM/, copia ahi los
CSV de cada agencia (puedes usar el nombre que quieras, el script identifica
la agencia leyendo la primera linea de metadata del archivo), y vuelve a
correr este script. Si aparece un valor de Producto o Estatus que no esta en
los mapeos, el script lo deja marcado como "Pendiente de mapear" y lo agrega
al final del CSV de mapeo correspondiente para que lo completes.
"""
import csv
import json
import re
import sys
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

import ftfy
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data_raw"
MAPEOS_DIR = RAW_DIR / "mapeos"
PROCESSED_DIR = RAW_DIR / "processed"
DOCS_DATA = ROOT / "docs" / "data"

TEXT_COLS_TO_FIX = ['Titulo', 'Nombre', 'Comentario', 'Asesor', 'Campaña',
                     'SubCampaña', 'Ultimo Seguimiento', 'Producto']
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')

PENDIENTE = "Pendiente de mapear"

# ---------------------------------------------------------------- utilidades

def fix_mojibake(s):
    if not isinstance(s, str) or s == '':
        return s
    return ftfy.fix_text(s)


def robust_load_csv(path):
    """Lee un CSV del CRM, tolerando filas con comas sin escapar (ej. dos
    correos separados por coma en el campo Correo)."""
    with open(path, encoding='utf-8') as f:
        meta = f.readline().strip()
        header = f.readline().strip().split(',')
        expected = len(header)
        rows = []
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            if len(row) == expected:
                rows.append(row)
            elif len(row) > expected:
                overflow = len(row) - expected
                merged = row[:6] + [';'.join(row[6:6 + overflow + 1])] + row[6 + overflow + 1:]
                rows.append(merged)
            # filas con menos columnas de las esperadas (renglones vacios al
            # final del archivo) se descartan
    df = pd.DataFrame(rows, columns=header)
    return meta, df


def parse_meta(meta_line):
    """'Agencia:MG-Interlomas,Rango:MesActual,...' -> {'Agencia': 'MG-Interlomas', ...}"""
    out = {}
    for part in meta_line.split(','):
        if ':' in part:
            k, v = part.split(':', 1)
            out[k.strip()] = v.strip()
    return out


def normalize_key(val):
    if not isinstance(val, str):
        return ''
    v = val.strip().lower()
    v = re.split(r'asunto:|final:', v)[0].strip()
    v = re.sub(r'\s*20\d{2}\s*$', '', v).strip()
    v = re.sub(r'\s+', ' ', v)
    return v


def is_invalid_producto(raw, key):
    if EMAIL_RE.search(raw):
        return True
    if len(key) > 20 and ' ' in key:
        return True
    return False


LOST_REASON_RULES = [
    ("Incontactable / no contesta", r"incontactable|no contesta|ilocalizable|no localizable"),
    ("Sin interés / no compró", r"no pidi[oó]|sin inter[eé]s|no quiere|ya no le interesa"),
    ("Compró en otro lugar", r"compr[oó] en otro|ya compr[oó]"),
    ("Datos incorrectos", r"dato.*incorrecto|no existe|datos incompletos"),
    ("Foráneo / fuera de zona", r"for[aá]neo"),
    ("Cita / seguimiento agendado", r"volver a llamar|cita|agend|asiste a piso"),
    ("Lead recién asignado", r"^lead asignado a"),
]

def categorize_lost_reason(text):
    if not isinstance(text, str) or not text.strip():
        return "Sin seguimiento registrado"
    t = text.lower()
    for label, pattern in LOST_REASON_RULES:
        if re.search(pattern, t):
            return label
    return "Otro"


# ---------------------------------------------------------------- mapeos

def load_mapeo_producto():
    path = MAPEOS_DIR / "mapeo_producto.csv"
    table = defaultdict(dict)  # marca -> {valor_normalizado: propuesta}
    with open(path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            table[row['marca']][row['valor_normalizado']] = row['propuesta_canonica']
    return table


def load_mapeo_estatus():
    path = MAPEOS_DIR / "mapeo_estatus.csv"
    table = {}
    with open(path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            table[row['valor_normalizado']] = (row['propuesta_canonica'], row['es_venta'])
    return table


def load_mapeo_agencias():
    path = MAPEOS_DIR / "mapeo_agencias.csv"
    table = {}
    with open(path, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            table[row['agencia_raw']] = (row['agencia_estandar'], row['marca'])
    return table


def append_pending(path, fieldnames, row):
    exists = path.exists()
    with open(path, 'a', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if not exists:
            w.writeheader()
        w.writerow(row)


# ---------------------------------------------------------------- pipeline

def process_month(month_dir, mapeo_producto, mapeo_estatus, mapeo_agencias):
    rows_out = []
    month = month_dir.name
    for csv_path in sorted(month_dir.glob("*.csv")):
        meta, df = robust_load_csv(csv_path)
        meta_d = parse_meta(meta)
        agencia_raw = meta_d.get("Agencia", csv_path.stem)

        if agencia_raw not in mapeo_agencias:
            print(f"  [!] Agencia nueva sin mapear: '{agencia_raw}' (archivo {csv_path.name}) "
                  f"-> agregala a data_raw/mapeos/mapeo_agencias.csv")
            agencia_std, marca = agencia_raw, "REVISAR"
            append_pending(MAPEOS_DIR / "mapeo_agencias.csv",
                            ["agencia_raw", "agencia_estandar", "marca"],
                            {"agencia_raw": agencia_raw, "agencia_estandar": agencia_raw, "marca": PENDIENTE})
        else:
            agencia_std, marca = mapeo_agencias[agencia_raw]

        for c in TEXT_COLS_TO_FIX:
            if c in df.columns:
                df[c] = df[c].apply(fix_mojibake)

        fechas_alta = pd.to_datetime(df['Fecha de Alta'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
        fechas_1a_atencion = pd.to_datetime(df['Fecha Primera Atencion'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
        tiempo_respuesta_min = (fechas_1a_atencion - fechas_alta).dt.total_seconds() / 60

        for i, r in df.iterrows():
            producto_raw = r.get('Producto', '') or ''
            key = normalize_key(producto_raw)
            if is_invalid_producto(producto_raw.strip(), key):
                producto_std = "Dato inválido (no es un producto)"
            else:
                table = mapeo_producto.get(marca, {})
                if key in table:
                    producto_std = table[key]
                else:
                    producto_std = PENDIENTE
                    append_pending(MAPEOS_DIR / "mapeo_producto.csv",
                                    ["marca", "valor_normalizado", "propuesta_canonica"],
                                    {"marca": marca, "valor_normalizado": key,
                                     "propuesta_canonica": f"REVISAR: {producto_raw.strip()}"})
                    mapeo_producto.setdefault(marca, {})[key] = PENDIENTE  # evita repetir el warning en esta corrida

            estatus_raw = (r.get('Estatus', '') or '').strip()
            ekey = estatus_raw.lower()
            if ekey in mapeo_estatus:
                estatus_std, es_venta = mapeo_estatus[ekey]
            else:
                estatus_std, es_venta = PENDIENTE, "No"
                append_pending(MAPEOS_DIR / "mapeo_estatus.csv",
                                ["valor_normalizado", "propuesta_canonica", "es_venta"],
                                {"valor_normalizado": ekey, "propuesta_canonica": f"REVISAR: {estatus_raw}", "es_venta": "No"})
                mapeo_estatus[ekey] = (estatus_std, es_venta)

            rows_out.append({
                "marca": marca,
                "agencia": agencia_std,
                "mes": month,
                "ag_lead": r.get('AgLead', ''),
                "fecha_alta": fechas_alta[i].isoformat() if pd.notna(fechas_alta[i]) else None,
                "producto_raw": producto_raw.strip(),
                "producto": producto_std,
                "temperatura": r.get('Temperatura', ''),
                "fuente": r.get('Fuente', ''),
                "origen": (r.get('Origen', '') or '').strip(),
                "estatus_raw": estatus_raw,
                "estatus": estatus_std,
                "es_venta": es_venta == "Sí",
                "asesor": r.get('Asesor', ''),
                "tiempo_respuesta_min": None if pd.isna(tiempo_respuesta_min[i]) else round(float(tiempo_respuesta_min[i]), 1),
                "medio_atendido": (r.get('Medio Atendido', '') or '').strip(),
                "campana": (r.get('Campaña', '') or '').strip(),
                "subcampana": (r.get('SubCampaña', '') or '').strip(),
                "citas_agendadas": int(r.get('#Citas Agendadas', 0) or 0),
                "citas_asistidas": int(r.get('#Citas Asistidas', 0) or 0),
                "demos": int(r.get('#Demos Agendadas y #Demos Asistidas', 0) or 0),
                "motivo": categorize_lost_reason(r.get('Ultimo Seguimiento', '')),
                "correo_o_tel_valido": r.get('Verificacion Correo/Teléfono', '') != 'No Valido Correo y Telefono',
            })
    return rows_out


def main():
    mapeo_producto = load_mapeo_producto()
    mapeo_estatus = load_mapeo_estatus()
    mapeo_agencias = load_mapeo_agencias()

    month_dirs = sorted([d for d in RAW_DIR.iterdir() if d.is_dir() and re.match(r"\d{4}-\d{2}$", d.name)])
    if not month_dirs:
        print("No hay carpetas de mes (formato AAAA-MM) dentro de data_raw/. Nada que procesar.")
        sys.exit(1)

    all_rows = []
    for md in month_dirs:
        print(f"Procesando {md.name} ...")
        all_rows.extend(process_month(md, mapeo_producto, mapeo_estatus, mapeo_agencias))

    df = pd.DataFrame(all_rows)
    df = df.drop_duplicates(subset=["agencia", "ag_lead", "mes"], keep="last")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    hist_path = PROCESSED_DIR / "leads_historico.csv"
    df.to_csv(hist_path, index=False, encoding='utf-8-sig')
    print(f"Historico actualizado: {hist_path} ({len(df)} leads)")

    pendientes = int((df['producto'] == PENDIENTE).sum() + (df['estatus'] == PENDIENTE).sum())
    if pendientes:
        print(f"[!] {pendientes} leads con Producto/Estatus pendiente de mapear. "
              f"Revisa los CSV en data_raw/mapeos/ (filas nuevas al final) antes de publicar.")

    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    agencias_meta = (df[['marca', 'agencia']].drop_duplicates()
                      .sort_values(['marca', 'agencia']).to_dict('records'))
    payload = {
        "generated_at": datetime.now().isoformat(timespec='seconds'),
        "months": sorted(df['mes'].unique().tolist()),
        "agencias": agencias_meta,
        "leads": json.loads(df.to_json(orient='records', force_ascii=False)),
    }
    out_path = DOCS_DATA / "dashboard_data.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"Datos del dashboard regenerados: {out_path} ({len(df)} leads, {len(payload['months'])} mes(es))")


if __name__ == "__main__":
    main()
