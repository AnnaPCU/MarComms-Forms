# Client × Country Matrix — formulario dinámico PCU

Aplicación web (React 18 + Vite + Tailwind CSS 4) para relevar, por cada combinación **Cliente × País**, las preguntas Q6 a Q14 del ejercicio de inteligencia comercial. Las respuestas se guardan en Supabase y se consolidan en un único Excel desde la página de administración.

Para configurar Supabase, GitHub y Vercel paso a paso, ver [SETUP.md](SETUP.md).

## Arquitectura

```
Persona que responde ──► Formulario (Vercel, estático) ──► Supabase · tabla responses
                                                                    ▲
Administrador ──► /#/admin (login Supabase Auth) ──► lee la tabla ──┘ ──► Excel consolidado (.xlsx / .csv)
```

- El formulario es una página estática. La clave `anon` de Supabase solo permite **insertar** filas (Row Level Security).
- La página `/#/admin` requiere un usuario creado en Supabase Auth y solo entonces puede **leer**.
- No hay servidor propio ni tareas programadas. El Excel se genera en el navegador del administrador al momento de descargarlo.

## Uso rápido

```bash
npm install
cp .env.example .env    # completar con la URL y la anon key del proyecto Supabase
npm run dev             # http://localhost:5173  ·  admin en http://localhost:5173/#/admin
npm run build           # dist/index.html (archivo único, autocontenido)
```

Sin las variables de entorno la app sigue funcionando en modo "solo exportar": el botón Submit se desactiva y se avisa en pantalla.

## Flujo del formulario

1. **Respondent**: nombre, país (lista de 33) y clientes (texto libre, uno o varios).
2. **Countries per client**: por cada cliente, chips de países con filtro.
3. **Client × Country details**: una tarjeta desplegable por combinación con Q6–Q14. Badge `n/9 answered` por tarjeta y panel lateral de progreso.
4. **Submit**: guarda en Supabase con un `submission_id` único. También permite bajar una copia propia en `.xlsx` o `.csv`.

El borrador se guarda automáticamente en `localStorage` del navegador (clave `pcu-client-country-matrix-v1`).

## Página de administración

`/#/admin` → login con email y contraseña → tarjetas de totales, tabla de envíos con filtro y:

- **Download consolidated Excel**: dos hojas, `Client x Country` (todas las filas de todas las personas) y `Submissions` (resumen por envío).
- **Download .csv**: la misma hoja principal en CSV UTF-8.
- `.xlsx` por fila: el Excel de una sola persona.

## Formato de exportación

Una fila por combinación Cliente × País. Columnas, en orden:

`Respondent Name · Respondent Country · Client · Country · Q6 Services · Q6 Other service · Q7 Stakeholder groups · Q8 Maturity (1-5) · Q9 Office type · Q10 Strategic importance (1-5) · Q11 Decision level · Q12 Main gap · Q12 Other gap · Q13 Main reason · Q13 Other reason · Q14 Most important action · Submitted at · Submission ID`

Las selecciones múltiples se unen con `; `.

## Editar las listas

Todas las listas maestras están en [`src/data/constants.js`](src/data/constants.js): países, servicios (Q6), tipos de oficina (Q9), niveles de decisión (Q11), gaps (Q12), motivos (Q13) y los máximos de selección. `CLIENT_SUGGESTIONS` permite precargar nombres de clientes para autocompletar.

## Estructura

```
supabase/schema.sql              tabla, índices, políticas RLS y vista de resumen
src/
  App.jsx                        enrutado por hash (#/ formulario · #/admin)
  pages/FormPage.jsx             formulario, ramificación N×M, validación, insert en Supabase
  pages/AdminPage.jsx            login, listado de envíos, Excel consolidado
  lib/supabase.js                cliente Supabase (lee VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
  components/ui.jsx              Section, Field, TagInput, ChipGroup, Scale, Button…
  components/ClientCountryCard.jsx  tarjeta Q6–Q14 y cálculo de completitud
  data/constants.js              listas maestras
  utils/export.js                registros, filas planas, mapeo a/desde la base, .xlsx y .csv
```
