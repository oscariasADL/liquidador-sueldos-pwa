import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  RegistroAsistencia,
  AsistenciaCreate,
  AsistenciaUpdate,
  AsistenciaConEmpleado,
} from '../../../core/models/asistencia.model';
import { AsyncState } from '../../../core/models/async-state.model';

const SELECT_WITH_EMPLEADO = '*, empleado:empleados(nombre, documento)';

export interface AsistenciaFilters {
  empleadoId: string | null;
  fechaInicio: string;
  fechaFin: string;
}

/**
 * Holds the attendance list in a signal store so every view reflects writes
 * immediately, without a page reload.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private supabase = inject(SupabaseService).supabase;
  private authService = inject(AuthService);

  readonly registros = signal<AsistenciaConEmpleado[]>([]);
  readonly state = signal<AsyncState>('idle');

  private lastFilters: AsistenciaFilters | null = null;

  /** Loads records applying the caller's role scope, then caches the filters. */
  async load(filters: AsistenciaFilters): Promise<void> {
    this.lastFilters = filters;
    this.state.set('loading');

    try {
      let query = this.supabase
        .from('registros_asistencia')
        .select(SELECT_WITH_EMPLEADO)
        .gte('fecha', filters.fechaInicio)
        .lte('fecha', filters.fechaFin)
        .order('fecha', { ascending: false });

      // Colaboradores are additionally constrained by RLS; this keeps the
      // request payload small and the UI consistent.
      const scopedEmpleadoId = this.authService.isAdmin()
        ? filters.empleadoId
        : this.authService.empleadoId();

      if (scopedEmpleadoId) {
        query = query.eq('empleado_id', scopedEmpleadoId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      this.registros.set((data ?? []) as AsistenciaConEmpleado[]);
      this.state.set('success');
    } catch (error) {
      console.error('Error loading asistencia:', error);
      this.registros.set([]);
      this.state.set('error');
    }
  }

  /** Re-runs the last load so lists stay in sync after a write. */
  async refresh(): Promise<void> {
    if (this.lastFilters) {
      await this.load(this.lastFilters);
    }
  }

  async getByEmpleado(
    empleadoId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<RegistroAsistencia[]> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .select('*')
      .eq('empleado_id', empleadoId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<AsistenciaConEmpleado | null> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .select(SELECT_WITH_EMPLEADO)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as AsistenciaConEmpleado | null;
  }

  async create(registro: AsistenciaCreate): Promise<RegistroAsistencia> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .insert(registro)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un registro para este empleado en esa fecha.');
      }
      throw new Error(error.message);
    }

    await this.refresh();
    return data;
  }

  async update(id: string, changes: AsistenciaUpdate): Promise<RegistroAsistencia> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.refresh();
    return data;
  }

  async countByFecha(fecha: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('registros_asistencia')
      .select('*', { count: 'exact', head: true })
      .eq('fecha', fecha);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  /** Total effective hours in a range, used by the colaborador summary. */
  async sumHoras(empleadoId: string, fechaInicio: string, fechaFin: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .select('horas_trabajadas')
      .eq('empleado_id', empleadoId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) throw new Error(error.message);
    const total = (data ?? []).reduce((sum, r) => sum + Number(r.horas_trabajadas ?? 0), 0);
    return Math.round(total * 100) / 100;
  }
}
