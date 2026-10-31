-- Migración 004 · latido de mantenimiento ("heartbeat")
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → pegar todo → Run.
-- Se puede volver a ejecutar sin romper nada.
--
-- Por qué: el plan gratuito pausa el proyecto tras ~7 días "sin actividad". Las lecturas
-- públicas a la tabla responses (que la seguridad filtra a cero filas) no alcanzaron:
-- el proyecto se pausó igual el 31/10/2026. Esta migración agrega una función que la tarea
-- programada llama para ESCRIBIR un registro real en la base y consultar la tabla de respuestas.
--
-- Seguridad:
--  · La tabla keepalive tiene RLS activado y ninguna política: nadie la lee ni la escribe
--    directamente con la clave pública.
--  · La única vía es la función keepalive_ping(), que solo actualiza su propio contador
--    y devuelve la hora. No expone datos del formulario.

create table if not exists public.keepalive (
  id          smallint    primary key default 1 check (id = 1),  -- una sola fila
  pinged_at   timestamptz not null default now(),
  source      text        not null default '',
  ping_count  bigint      not null default 0
);

alter table public.keepalive enable row level security;
revoke all on public.keepalive from anon, authenticated;

create or replace function public.keepalive_ping(p_source text default 'unknown')
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  -- Lectura real sobre la tabla del formulario (no devuelve nada al llamador).
  perform count(*) from public.responses;

  -- Escritura real: una sola fila que se actualiza en cada latido.
  insert into public.keepalive (id, pinged_at, source, ping_count)
  values (1, v_now, left(coalesce(p_source, 'unknown'), 40), 1)
  on conflict (id) do update
    set pinged_at  = excluded.pinged_at,
        source     = excluded.source,
        ping_count = public.keepalive.ping_count + 1;

  return v_now;
end;
$$;

revoke all on function public.keepalive_ping(text) from public;
grant execute on function public.keepalive_ping(text) to anon, authenticated;

-- Que la API vea la función nueva sin esperar.
notify pgrst, 'reload schema';

-- Comprobación: debe devolver la hora actual.
select public.keepalive_ping('sql-editor') as first_ping;
