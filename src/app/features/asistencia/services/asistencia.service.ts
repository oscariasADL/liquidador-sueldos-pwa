import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  RegistroAsistencia,
  AsistenciaCreate,
  AsistenciaUpdate,
} from '../../../core/models/asistencia.model';

@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private supabase = inject(SupabaseService).supabase;

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
      .order('fecha', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getByFecha(fecha: string): Promise<RegistroAsistencia[]> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .select('*, empleado:empleados(nombre, documento)')
      .eq('fecha', fecha)
      .order('hora_entrada', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(registro: AsistenciaCreate): Promise<RegistroAsistencia> {
    const { data, error } = await this.supabase
      .from('registros_asistencia')
      .insert(registro)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un registro de asistencia para este empleado en esta fecha.');
      }
      throw new Error(error.message);
    }
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
}
