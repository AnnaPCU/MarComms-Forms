-- Migración 003 · corrige la alerta "Security Definer View" de Supabase sobre public.submissions
-- Ejecutar UNA vez en Supabase → SQL Editor → Run.
--
-- Problema: una vista se evalúa por defecto con los permisos de quien la creó (postgres), así que
-- la API pública podía leer el resumen de envíos (nombres de quienes responden) con la clave anon,
-- saltándose las políticas RLS de la tabla responses.
-- Solución: la vista pasa a evaluarse con los permisos de quien consulta (security_invoker), de modo
-- que aplican las mismas reglas que la tabla (anon no lee nada, solo usuarios con sesión). Además se
-- revoca el acceso del rol anon a la vista por si acaso.

alter view public.submissions set (security_invoker = true);
revoke all on public.submissions from anon;
grant select on public.submissions to authenticated;
