-- ============================================
-- ORIGAMIAPP — Roles y Profiles
-- ============================================
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_initial_schema.sql
-- Dashboard → SQL Editor → New Query → Paste → Run

-- ============================================
-- 1. Agregar email a empleados
-- ============================================
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill de empleados existentes (evita NULL en unique index)
UPDATE empleados
SET email = 'empleado-' || substr(id::text, 1, 8) || '@origamiapp.local'
WHERE email IS NULL;

ALTER TABLE empleados ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_email ON empleados(lower(email));

-- ============================================
-- 2. TABLA: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'colaborador' CHECK (role IN ('admin', 'colaborador')),
  empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_empleado ON profiles(empleado_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================
-- SECURITY DEFINER para evitar recursión infinita en las policies de profiles

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION current_user_empleado_id()
RETURNS UUID AS $$
  SELECT empleado_id FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_user_role() = 'admin', false);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================
-- 4. RLS: profiles
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario lee su propio profile; el admin lee todos
CREATE POLICY "select_own_or_admin_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Solo el admin modifica roles / asignaciones
CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 5. RLS: empleados (reescritura)
-- ============================================
DROP POLICY IF EXISTS "authenticated_select_empleados" ON empleados;
DROP POLICY IF EXISTS "authenticated_insert_empleados" ON empleados;
DROP POLICY IF EXISTS "authenticated_update_empleados" ON empleados;

-- Admin ve todos; colaborador solo su propio registro
CREATE POLICY "select_empleados_by_role" ON empleados
  FOR SELECT TO authenticated
  USING (is_admin() OR id = current_user_empleado_id());

-- Solo admin crea empleados (en la práctica lo hace la Edge Function)
CREATE POLICY "admin_insert_empleados" ON empleados
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Solo admin edita empleados
CREATE POLICY "admin_update_empleados" ON empleados
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 6. RLS: registros_asistencia (reescritura)
-- ============================================
DROP POLICY IF EXISTS "authenticated_select_asistencia" ON registros_asistencia;
DROP POLICY IF EXISTS "authenticated_insert_asistencia" ON registros_asistencia;
DROP POLICY IF EXISTS "authenticated_update_asistencia" ON registros_asistencia;

-- Admin ve todo; colaborador solo sus registros
CREATE POLICY "select_asistencia_by_role" ON registros_asistencia
  FOR SELECT TO authenticated
  USING (is_admin() OR empleado_id = current_user_empleado_id());

-- Colaborador solo puede registrar para sí mismo; admin para cualquiera
CREATE POLICY "insert_asistencia_by_role" ON registros_asistencia
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR empleado_id = current_user_empleado_id());

-- Colaborador edita solo sus registros; admin edita cualquiera
CREATE POLICY "update_asistencia_by_role" ON registros_asistencia
  FOR UPDATE TO authenticated
  USING (is_admin() OR empleado_id = current_user_empleado_id())
  WITH CHECK (is_admin() OR empleado_id = current_user_empleado_id());

-- ============================================
-- 7. RLS: liquidaciones (reescritura)
-- ============================================
DROP POLICY IF EXISTS "authenticated_select_liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "authenticated_insert_liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "authenticated_update_liquidaciones" ON liquidaciones;

-- Admin ve todas; colaborador ve solo sus liquidaciones (para su desprendible)
CREATE POLICY "select_liquidaciones_by_role" ON liquidaciones
  FOR SELECT TO authenticated
  USING (is_admin() OR empleado_id = current_user_empleado_id());

-- Solo admin liquida
CREATE POLICY "admin_insert_liquidaciones" ON liquidaciones
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_liquidaciones" ON liquidaciones
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 8. ASIGNAR ROL ADMIN A TU USUARIO
-- ============================================
-- IMPORTANTE: reemplaza 'TU_EMAIL_AQUI' por el email con el que te logueas.
-- Sin esto no podrás ver nada, porque sin profile no tienes rol.

INSERT INTO profiles (user_id, role, empleado_id)
SELECT id, 'admin', NULL
FROM auth.users
WHERE email = 'TU_EMAIL_AQUI'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', empleado_id = NULL;

-- Verificación: debe devolver una fila con role = admin
-- SELECT u.email, p.role, p.empleado_id
-- FROM profiles p JOIN auth.users u ON u.id = p.user_id;
