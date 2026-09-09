-- ============================================
-- LIQUIDADOR DE SUELDOS — Initial Schema
-- ============================================
-- Run this script in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- ============================================
-- TABLA: empleados
-- ============================================
CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  documento TEXT NOT NULL UNIQUE,
  cargo TEXT,
  valor_hora NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLA: registros_asistencia
-- ============================================
CREATE TABLE IF NOT EXISTS registros_asistencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME,
  minutos_almuerzo INTEGER NOT NULL DEFAULT 60,
  horas_trabajadas NUMERIC(5,2),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, fecha)
);

-- ============================================
-- TABLA: liquidaciones
-- ============================================
CREATE TABLE IF NOT EXISTS liquidaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  total_horas NUMERIC(7,2) NOT NULL,
  valor_hora NUMERIC(10,2) NOT NULL,
  total_pagar NUMERIC(12,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
  notas TEXT,
  sheets_sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sheets_sync_status IN ('pending', 'synced', 'failed')),
  sheets_synced_at TIMESTAMPTZ,
  sheets_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEX: Performance queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_asistencia_empleado_fecha ON registros_asistencia(empleado_id, fecha);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_empleado ON liquidaciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_estado ON liquidaciones(estado);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_empleados
  BEFORE UPDATE ON empleados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_asistencia
  BEFORE UPDATE ON registros_asistencia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS: Habilitar en todas las tablas
-- ============================================
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: Solo usuarios autenticados
-- ============================================

-- empleados: SELECT, INSERT, UPDATE para authenticated
CREATE POLICY "authenticated_select_empleados" ON empleados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_empleados" ON empleados
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_empleados" ON empleados
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- registros_asistencia: SELECT, INSERT, UPDATE para authenticated
CREATE POLICY "authenticated_select_asistencia" ON registros_asistencia
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_asistencia" ON registros_asistencia
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_asistencia" ON registros_asistencia
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- liquidaciones: SELECT, INSERT, UPDATE para authenticated
CREATE POLICY "authenticated_select_liquidaciones" ON liquidaciones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_liquidaciones" ON liquidaciones
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_liquidaciones" ON liquidaciones
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- NOTE: No DELETE policies — records are deactivated, never deleted from client

-- ============================================
-- SEED: Empleados de ejemplo para la demo
-- ============================================
INSERT INTO empleados (nombre, documento, cargo, valor_hora) VALUES
  ('Carlos Andrés López', '1001234567', 'Desarrollador Frontend', 5000.00),
  ('María Fernanda Ríos', '1009876543', 'Diseñadora UX', 5000.00),
  ('Juan David Herrera', '1005551234', 'Analista QA', 5000.00)
ON CONFLICT (documento) DO NOTHING;
