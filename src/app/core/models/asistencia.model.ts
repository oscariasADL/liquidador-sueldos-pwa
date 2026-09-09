export interface RegistroAsistencia {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  minutos_almuerzo: number;
  horas_trabajadas: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsistenciaCreate {
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  minutos_almuerzo: number;
  horas_trabajadas: number;
  notas?: string;
}

export interface AsistenciaUpdate {
  hora_entrada?: string;
  hora_salida?: string;
  minutos_almuerzo?: number;
  horas_trabajadas?: number;
  notas?: string | null;
}

export interface AsistenciaConEmpleado extends RegistroAsistencia {
  empleado?: {
    nombre: string;
    documento: string;
  };
}
