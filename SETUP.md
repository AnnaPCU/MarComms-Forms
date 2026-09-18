# Puesta en marcha · Vercel + Supabase

Tiempo estimado: 30 a 40 minutos. Hay tres bloques: Supabase (base de datos), GitHub (código) y Vercel (publicación). Cada paso dice qué botón tocar y qué valor copiar.

---

## Bloque 1 · Supabase (donde se guardan las respuestas)

### 1.1 Crear el proyecto

1. Entrar en https://supabase.com y hacer clic en **Start your project** / **Sign in**. Iniciar sesión con GitHub es lo más rápido.
2. **New project**.
   - Organization: la tuya (o crear una, por ejemplo `PCU`).
   - Name: `pcu-client-country-matrix`.
   - Database Password: generar una con el botón y **guardarla** en tu gestor de contraseñas. No se vuelve a usar en esta guía, pero hace falta si algún día se quiere conectar otra herramienta.
   - Region: `West EU (Ireland)` o la más cercana a la mayoría de quienes responden.
   - Plan: Free.
3. **Create new project**. Tarda 1 a 2 minutos.

### 1.2 Crear la tabla y las reglas de seguridad

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abrir el archivo `supabase/schema.sql` de este proyecto, copiar todo su contenido y pegarlo en el editor.
3. **Run** (abajo a la derecha). Debe decir `Success. No rows returned`.
4. Comprobar: menú **Table Editor** → debe aparecer la tabla `responses` vacía.

Si la tabla `responses` **ya existía** de una versión anterior, en vez de `schema.sql` ejecutar una sola vez `supabase/migrations/002_template_alignment.sql` (agrega la columna región, pasa Q8 y Q10 a texto y borra la fila de prueba).

Qué hizo ese script: creó la tabla, activó la seguridad por filas y dejó dos reglas. Cualquier persona con el link del formulario puede **insertar** respuestas y nada más. Solo un usuario con sesión iniciada puede **leer**. Nadie puede borrar ni editar desde la web.

### 1.3 Crear tu usuario de administración

1. Menú **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: el tuyo. Password: una contraseña fuerte. Marcar **Auto Confirm User**.
3. **Create user**.

Este es el usuario con el que vas a entrar a `/#/admin` para descargar el Excel consolidado. Se pueden crear más usuarios para otras personas de la misma forma.

### 1.4 Cerrar el registro público

1. **Authentication** → **Sign In / Providers** (o **Providers** según la versión) → **Email**.
2. Desactivar **Allow new users to sign up**. **Save**.

Así nadie puede crearse una cuenta por su lado y leer las respuestas. Solo los usuarios que vos crees en el paso 1.3.

### 1.5 Copiar las dos claves

1. Menú **Project Settings** (engranaje) → **API**.
2. Copiar y guardar en un bloc de notas:
   - **Project URL**: algo como `https://abcdefghij.supabase.co`
   - **anon public** key: un texto largo que empieza con `eyJ`

La clave `anon` es pública por diseño. Solo permite lo que las reglas del paso 1.2 autorizan. **No copiar nunca** la `service_role`.

---

## Bloque 2 · GitHub (donde vive el código)

### 2.1 Crear el repositorio

1. https://github.com/new
2. Repository name: `pcu-client-country-matrix`. **Private**. No marcar README ni .gitignore.
3. **Create repository**. Dejar la pestaña abierta: muestra la URL del repo.

### 2.2 Subir el código

En una terminal dentro de la carpeta del proyecto (o pedírmelo a mí en la sesión de Claude Code):

```bash
git add .
```

```bash
git commit -m "Client x Country Matrix form with Supabase and admin export"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/TU_USUARIO/pcu-client-country-matrix.git
```

```bash
git push -u origin main
```

Reemplazar `TU_USUARIO` por tu usuario de GitHub. Si Git pide credenciales, usar el login del navegador que se abre.

---

## Bloque 3 · Vercel (donde se publica el formulario)

### 3.1 Importar el proyecto

1. https://vercel.com → **Add New…** → **Project**.
2. Si es la primera vez, **Continue with GitHub** y autorizar el acceso al repo `pcu-client-country-matrix`.
3. En la lista, **Import** junto al repo.
4. Vercel detecta **Vite** solo. No tocar Build Command ni Output Directory.

### 3.2 Cargar las variables de entorno

Antes de **Deploy**, desplegar **Environment Variables** y agregar dos:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | la Project URL del paso 1.5 |
| `VITE_SUPABASE_ANON_KEY` | la anon public key (o publishable key `sb_publishable_…`) del paso 1.5 |

También se aceptan los nombres que muestra Supabase por defecto: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### 3.3 Publicar

1. **Deploy**. Tarda alrededor de un minuto.
2. Vercel muestra la URL pública, tipo `https://pcu-client-country-matrix.vercel.app`. Ese es el link que se distribuye.

Si se agregaron las variables después del primer deploy, hay que hacer **Deployments → ⋯ → Redeploy** para que las tome.

---

## Bloque 4 · Prueba de punta a punta

1. Abrir la URL de Vercel. Completar nombre, país, un cliente, un país y una tarjeta. **Submit form**. Debe aparecer un mensaje verde con una referencia de 8 caracteres.
2. En Supabase → **Table Editor** → `responses`: deben aparecer las filas.
3. Abrir `https://TU-URL.vercel.app/#/admin`. Entrar con el usuario del paso 1.3. Debe listar el envío. **Download consolidated Excel** baja un archivo con dos hojas: `Survey` (una fila por combinación, mismas columnas y encabezados que la plantilla Excel más fecha e ID de envío) y `Submissions` (un renglón por persona).
4. Desde Supabase → **Table Editor** se puede borrar la fila de prueba si se quiere.

---

## Operación diaria

- **Distribuir**: enviar la URL de Vercel. No hace falta cuenta para responder.
- **Consolidar**: entrar a `/#/admin`, **Download consolidated Excel**, adjuntarlo al correo que corresponda. También se puede bajar el Excel de una sola persona con el botón `.xlsx` de su fila.
- **Correcciones**: si alguien reenvía, aparece como un envío nuevo con fecha posterior. En la hoja `Submissions` se ve rápido quién envió más de una vez.
- **Borrar un envío**: Supabase → **Table Editor** → filtrar por `submission_id` → seleccionar filas → **Delete**.
- **Cambiar listas** (países, servicios, opciones): editar `src/data/constants.js`, hacer commit y push. Vercel republica solo.
- **Mail más adelante**: cuando se quiera avisar por correo, se agrega un Database Webhook en Supabase o una Edge Function. No requiere tocar el formulario.

## Desarrollo local

Crear un archivo `.env` en la raíz con las dos variables (ver `.env.example`) y ejecutar:

```bash
npm run dev
```
