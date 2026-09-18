-- Migración 002 · alinear la tabla existente con "ABCCD Survey - Manual Template.xlsx"
-- Ejecutar UNA vez en Supabase → SQL Editor → Run, si la tabla responses ya fue creada
-- con la versión anterior de schema.sql. Para instalaciones nuevas alcanza con schema.sql.

-- Nueva columna región (APAC, Americas, EEMA, NEG)
alter table public.responses add column if not exists region text not null default '';

-- Q8 y Q10 pasan de escala 1-5 a texto (opciones del template)
alter table public.responses drop constraint if exists responses_maturity_check;
alter table public.responses drop constraint if exists responses_importance_check;
alter table public.responses alter column maturity   type text using coalesce(maturity::text, '');
alter table public.responses alter column importance type text using coalesce(importance::text, '');
alter table public.responses alter column maturity   set default '';
alter table public.responses alter column importance set default '';
alter table public.responses alter column maturity   set not null;
alter table public.responses alter column importance set not null;

-- Limpiar la fila de prueba que se insertó al verificar la conexión
delete from public.responses where respondent_name = 'TEST ROW - delete me';
