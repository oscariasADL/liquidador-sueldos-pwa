-- ============================================
-- ORIGAMIAPP — Eliminación de empleados y asistencia de solo lectura
-- ============================================
-- Ejecutar en Supabase SQL Editor DESPUÉS de 002_roles_and_profiles.sql

-- ============================================
-- 1. El colaborador ya no edita registros de asistencia
-- ============================================
-- Antes: colaborador podía actualizar sus propios registros.
-- Ahora: solo el admin corrige registros ya creados. El colaborador
-- únicamente puede crear (INSERT) y consultar (SELECT).

DROP POLICY IF EXISTS "update_asistencia_by_role" ON registros_asistencia;

CREATE POLICY "admin_update_asistencia" ON registros_asistencia
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 2. Permitir eliminar empleados (solo admin)
-- ============================================
-- Las FK de registros_asistencia y liquidaciones usan ON DELETE RESTRICT,
-- así que Postgres bloquea la eliminación si el empleado tiene historial.
-- La Edge Function delete-empleado valida esto antes y devuelve un mensaje
-- claro sugiriendo desactivar en su lugar.

CREATE POLICY "admin_delete_empleados" ON empleados
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- 3. Verificación
-- ============================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('empleados', 'registros_asistencia', 'liquidaciones')
-- ORDER BY tablename, cmd;
