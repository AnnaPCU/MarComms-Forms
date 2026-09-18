-- ABCCD Survey · Client × Country · esquema Supabase (instalación desde cero)
-- Pegar completo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin romper nada.
-- Si la tabla ya existía con la versión anterior, ejecutar en su lugar supabase/migrations/002_template_alignment.sql

create extension if not exists "pgcrypto";

-- Una fila por combinación Cliente × País. Un envío del formulario (submission_id)
-- genera tantas filas como combinaciones haya respondido la persona.
create table if not exists public.responses (
  id                  bigint generated always as identity primary key,
  submission_id       uuid        not null,
  submitted_at        timestamptz not null default now(),
  respondent_name     text        not null,
  respondent_country  text        not null,
  client              text        not null,                 -- ADM, Bunge, Cargill, COFCO, LDC
  region              text        not null default '',      -- APAC, Americas, EEMA, NEG
  country             text        not null,
  services            text[]      not null default '{}',    -- Q6
  service_other       text        not null default '',
  stakeholders        text[]      not null default '{}',    -- Q7
  maturity            text        not null default '',      -- Q8
  office_type         text        not null default '',      -- Q9
  importance          text        not null default '',      -- Q10
  decisions           text        not null default '',      -- Q11
  gaps                text[]      not null default '{}',    -- Q12 (hasta 2)
  gap_other           text        not null default '',
  reasons             text[]      not null default '{}',    -- Q13, alineado posicionalmente con gaps
  reason_other        text        not null default '',
  action              text        not null default '',      -- Q14
  created_at          timestamptz not null default now()
);

create index if not exists responses_submitted_at_idx on public.responses (submitted_at desc);
create index if not exists responses_submission_idx   on public.responses (submission_id);

-- Seguridad por filas (RLS):
--  · Cualquier visitante del formulario (rol anon) puede INSERTAR, nada más.
--  · Solo usuarios con sesión iniciada (rol authenticated) pueden LEER.
--  · Nadie puede modificar ni borrar desde la app. Se hace desde el panel de Supabase.
alter table public.responses enable row level security;

drop policy if exists "respondents can insert" on public.responses;
create policy "respondents can insert"
  on public.responses for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins can read" on public.responses;
create policy "admins can read"
  on public.responses for select
  to authenticated
  using (true);

-- Vista de resumen: un renglón por envío. Útil para mirar rápido en el panel de Supabase.
create or replace view public.submissions as
  select submission_id,
         min(submitted_at)                as submitted_at,
         min(respondent_name)             as respondent_name,
         min(respondent_country)          as respondent_country,
         count(distinct client)           as clients,
         count(*)                         as rows
  from public.responses
  group by submission_id
  order by submitted_at desc;
