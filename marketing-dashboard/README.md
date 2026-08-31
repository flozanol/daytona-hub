# Grupo Daytona · Dashboard de Marketing

Dashboard estático (HTML + JS, sin backend propio) para consolidar los
reportes mensuales de leads de todas las agencias del grupo. Vive como parte
de este mismo proyecto (`daytona-hub`) y se publica junto con él en Vercel.

## Cómo queda protegido

El sitio del dashboard se sirve desde `public/marketing-dashboard/`, que es
la carpeta de estáticos de Next.js. Como tu `proxy.ts` protege *todas* las
rutas del sitio excepto `/login` (revisa su `matcher`), el dashboard queda
automáticamente detrás del mismo login que ya usa el resto de daytona-hub —
nadie sin `daytona_token` puede verlo. No hicimos nada especial para esto,
es un efecto de cómo ya está armado tu proyecto; si en algún momento cambias
el `matcher` de `proxy.ts` para excluir más rutas públicas, verifica que
`/marketing-dashboard` no quede incluido ahí sin querer.

## Qué hay en este proyecto

```
public/marketing-dashboard/    # esto es lo que sirve Vercel (protegido por tu login)
  index.html                       el dashboard
  vendor/chart.umd.js              libreria de graficas (local, no depende de internet)
  data/dashboard_data.json         datos ya limpios y agregados (generado por build.py)

marketing-dashboard/           # el pipeline — esto NO se sirve como sitio
  data_raw/
    mapeos/              tablas editables: como se traduce cada valor "crudo" del CRM
      mapeo_producto.csv     (modelo -> nombre estandar, por marca)
      mapeo_estatus.csv      (estatus del CRM -> etapa del embudo)
      mapeo_agencias.csv     (nombre del archivo -> agencia + marca)
    processed/
      leads_historico.csv  TODOS los leads ya limpios y acumulados (sin datos personales)
    2026-08/              (ejemplo) CSV originales de agosto, uno por agencia — NO se sube a git
  scripts/
    build.py              limpia, estandariza y consolida -> regenera public/marketing-dashboard/data/dashboard_data.json
```

## ⚠️ Sobre los datos personales

Los CSV originales del CRM traen datos personales de cada cliente (nombre,
teléfono, correo). El `.gitignore` de `marketing-dashboard/` ya está
configurado para que `data_raw/AAAA-MM/*.csv` **nunca** se suba al
repositorio — esos archivos se quedan solo en tu máquina. El pipeline
(`scripts/build.py`) ya quita esos campos antes de generar los datos que sí
se publican.

## Cómo agregar el mes siguiente

1. Crea una carpeta nueva `marketing-dashboard/data_raw/AAAA-MM/` (ej.
   `data_raw/2026-09/`).
2. Copia ahí el CSV de cada agencia tal cual lo exporta el CRM (el nombre del
   archivo no importa — el script identifica la agencia leyendo la primera
   línea del archivo).
3. Corre:
   ```
   python3 marketing-dashboard/scripts/build.py
   ```
   (desde la raíz del repo)
4. Revisa la consola. Si aparece un modelo o estatus que el script no
   reconoce, lo va a marcar como "Pendiente de mapear" y va a agregar una
   fila nueva al final del CSV correspondiente en `data_raw/mapeos/` con una
   propuesta tipo `REVISAR: <valor>`. Ábrelo, corrige la columna
   `propuesta_canonica` con el nombre correcto, y vuelve a correr el script.
5. Sube los cambios (`git add public/marketing-dashboard marketing-dashboard/data_raw/mapeos marketing-dashboard/data_raw/processed && git commit ... && git push`
   — el `.gitignore` se encarga de que los CSV originales con datos
   personales no se incluyan). Vercel despliega solo, como con el resto del
   proyecto.

## Requisitos para correr el script

Python 3 con `pandas` y `ftfy` instalados:
```
pip install pandas ftfy
```

## Qué mide cada cosa (por si alguien más en el equipo edita esto)

- **"Ventas"** en este dashboard es *solo* lo que trae el reporte de leads
  del CRM — hoy son 8 de 2,958 leads del corte de agosto. El cierre real de
  venta probablemente vive en otro sistema (DMS); cuando ese dato se
  incorpore, va a reemplazar esta cifra.
- **"Finalizado"** = se cerró el seguimiento sin que el cliente comprara
  (confirmado por Fede, ago-2026). No cuenta como venta.
- **Tiempo de primera atención**: muchos leads (sobre todo en las agencias
  Honda) se "atienden" en segundos porque el primer contacto es un bot de
  WhatsApp automático, no un asesor humano. Por eso el dashboard muestra
  mediana y P75 por separado — el P75 es el que revela si hay agencias con
  cola de espera real (ej. MG-Interlomas).
