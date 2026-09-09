export interface Liquidacion {
  id: string;
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_horas: number;
  valor_hora: number;
  total_pagar: number;
  estado: 'pendiente' | 'pagado';
  notas: string | null;
  sheets_sync_status: 'pending' | 'synced' | 'failed';
  sheets_synced_at: string | null;
  sheets_sync_error: string | null;
  created_at: string;
}

export interface LiquidacionCreate {
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_horas: number;
  valor_hora: number;
  total_pagar: number;
  notas?: string;
}

export interface LiquidacionConEmpleado extends Liquidacion {
  empleado?: {
    nombre: string;
    documento: string;
  };
}

export interface DesgloseDia {
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  minutos_almuerzo: number;
  horas_trabajadas: number;
  es_hora_extra: boolean;
}
