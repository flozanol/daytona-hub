# Grupo Daytona · Dashboard de Marketing

Dashboard estático (HTML + JS, sin backend) para consolidar los reportes
mensuales de leads de todas las agencias del grupo. Pensado para publicarse
con **GitHub Pages**.

## ⚠️ Antes de subir esto a GitHub — lee esto

1. **Los CSV originales del CRM traen datos personales de cada cliente**
   (nombre, teléfono, correo). El `.gitignore` ya está configurado para que
   `data_raw/AAAA-MM/*.csv` **nunca** se suba al repositorio — esos archivos
   se quedan solo en tu máquina. El pipeline (`scripts/build.py`) ya quita
   esos campos antes de generar los datos que sí se publican
   (`docs/data/dashboard_data.json` y `data_raw/processed/leads_historico.csv`).

2. **GitHub Pages en un plan Free o Pro es siempre público en internet**,
   aunque el repositorio sea privado — cualquiera con el link puede ver el
   sitio. Aunque ya quitamos los datos personales de clientes, el dashboard
   sí muestra información sensible del negocio: volumen de leads por
   agencia, tasas de conversión, y desempeño por asesor **con nombre y
   apellido**. Antes de publicarlo, decide con qué nivel de exposición estás
   cómodo:
   - **Repo público + Pages público (gratis):** cualquiera con el link ve
     todo. El link no es fácil de adivinar, pero tampoco es privado de
     verdad.
   - **GitHub Enterprise Cloud:** es el único plan de GitHub que permite un
     sitio de Pages con acceso restringido de verdad (login requerido).
   - **Otra alternativa gratuita con control de acceso real:** publicar este
     mismo sitio estático en Cloudflare Pages + Cloudflare Access (permite
     pedir login por correo a un grupo cerrado de personas, gratis para
     equipos chicos) en vez de GitHub Pages. La carpeta `docs/` serviría
     igual ahí, solo cambia dónde se publica.

   Si no estás seguro, la opción más simple para empezar es dejarlo en un
   repo público pero sin anunciar el link ampliamente, y migrar a una opción
   con login más adelante si el grupo crece.

## Qué hay en este proyecto

```
data_raw/
  mapeos/              # tablas editables: como se traduce cada valor "crudo" del CRM
    mapeo_producto.csv     (modelo -> nombre estandar, por marca)
    mapeo_estatus.csv      (estatus del CRM -> etapa del embudo)
    mapeo_agencias.csv     (nombre del archivo -> agencia + marca)
  processed/
    leads_historico.csv # TODOS los leads ya limpios y acumulados (sin datos personales)
  2026-08/             # (ejemplo) CSV originales de agosto, uno por agencia — NO se sube a git
scripts/
  build.py             # limpia, estandariza y consolida -> regenera docs/data/dashboard_data.json
docs/
  index.html           # el dashboard (esto es lo que sirve GitHub Pages)
  data/dashboard_data.json
```

## Cómo agregar el mes siguiente

1. Crea una carpeta nueva `data_raw/AAAA-MM/` (ej. `data_raw/2026-09/`).
2. Copia ahí el CSV de cada agencia tal cual lo exporta el CRM (el nombre del
   archivo no importa — el script identifica la agencia leyendo la primera
   línea del archivo).
3. Corre:
   ```
   python3 scripts/build.py
   ```
4. Revisa la consola. Si aparece un modelo o estatus que el script no
   reconoce, lo va a marcar como "Pendiente de mapear" y va a agregar una
   fila nueva al final del CSV correspondiente en `data_raw/mapeos/` con una
   propuesta tipo `REVISAR: <valor>`. Ábrelo, corrige la columna
   `propuesta_canonica` con el nombre correcto, y vuelve a correr el script.
5. Sube los cambios a GitHub (`git add docs data_raw/mapeos data_raw/processed && git commit ...`
   — el `.gitignore` se encarga de que los CSV originales con datos
   personales no se incluyan). GitHub Pages actualiza el sitio solo, en
   cuanto detecta el push.

## Cómo publicarlo la primera vez

1. Crea el repositorio en GitHub y sube este proyecto (`git init`, `git add .`,
   `git commit`, `git remote add origin ...`, `git push`).
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy
   from a branch → Branch: main, carpeta `/docs`** → Save.
3. GitHub te da la URL del sitio (algo como
   `https://tu-usuario.github.io/tu-repo/`) en uno o dos minutos.

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
