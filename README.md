# ABCCD Survey · Client × Country — formulario dinámico PCU

Aplicación web (React 18 + Vite + Tailwind CSS 4) que reproduce la plantilla `ABCCD Survey - Manual Template.xlsx`: por cada combinación **Cliente × Región × País**, las preguntas Q6 a Q14 del ejercicio de inteligencia comercial. Listas y textos de pregunta salen de la hoja `Validation` de esa plantilla. Las respuestas se guardan en Supabase y se consolidan en un único Excel desde la página de administración.

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

1. **Respondent and clients**: email corporativo (dominio pcugroup.com), país y clientes (ADM, Bunge, Cargill, COFCO, LDC).
2. **Regions and countries per client**: por cada cliente, regiones (APAC, Americas, EEMA, NEG) y, dentro de cada región, sus países.
3. **Client × Country details**: una tarjeta desplegable por combinación con Q6–Q14. Q12 admite hasta 2 gaps y Q13 pide un motivo por cada gap elegido. Badge `n/9 answered` por tarjeta y panel lateral de progreso.
4. **Submit**: guarda en Supabase con un `submission_id` único. También permite bajar una copia propia en `.xlsx` o `.csv`.

El borrador se guarda automáticamente en `localStorage` del navegador (clave `pcu-client-country-matrix-v1`).

## Página de administración

`/#/admin` → login con email y contraseña → tarjetas de totales, tabla de envíos con filtro y:

- **Download consolidated Excel**: dos hojas, `Client x Country` (todas las filas de todas las personas) y `Submissions` (resumen por envío).
- **Download .csv**: la misma hoja principal en CSV UTF-8.
- `.xlsx` por fila: el Excel de una sola persona.

## Formato de exportación

Una fila por combinación Cliente × País, con las mismas 14 columnas y los mismos encabezados de la hoja `Survey` de la plantilla (A–N: Respondent email, Respondent country, cliente, región, país, Q6 a Q14), más dos columnas de control al final: `Submitted at` y `Submission ID`.

Las selecciones múltiples se unen con `; `. En Q13 los motivos van en el mismo orden que los gaps de Q12. Cuando se elige "Other", se exporta como `Other: <texto>`.

## Editar las listas

Todas las listas maestras están en [`src/data/constants.js`](src/data/constants.js): clientes, regiones y países por región, servicios (Q6), stakeholders (Q7), madurez (Q8), tipo de oficina (Q9), importancia (Q10), nivel de decisión (Q11), gaps (Q12), motivos (Q13) y los textos de pregunta usados como encabezados. Si cambia la plantilla Excel, se cambia ahí.

## Estructura

```
supabase/schema.sql              tabla, índices, políticas RLS y vista de resumen (instalación nueva)
supabase/migrations/002_*.sql    migración para tablas creadas con la versión anterior
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
