import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from '../../../core/models/empleado.model';

@Injectable({ providedIn: 'root' })
export class EmpleadoService {
  private supabase = inject(SupabaseService).supabase;

  async getAll(): Promise<Empleado[]> {
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getAllIncludingInactive(): Promise<Empleado[]> {
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .order('estado', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<Empleado | null> {
    const { data, error } = await this.supabase
      .from('empleados')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Creates the employee through the create-empleado Edge Function, which also
   * provisions the auth account and the colaborador profile. Direct inserts are
   * not used because creating an auth user requires the service_role key.
   */
  async create(empleado: EmpleadoCreate): Promise<Empleado> {
    const { data, error } = await this.supabase.functions.invoke('create-empleado', {
      body: empleado,
    });

    if (error) {
      const detail = await this.extractFunctionError(error);
      throw new Error(detail);
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data.empleado as Empleado;
  }

  async update(id: string, changes: EmpleadoUpdate): Promise<Empleado> {
    const { data, error } = await this.supabase
      .from('empleados')
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Ya existe un empleado con ese documento.');
      }
      throw new Error(error.message);
    }
    return data;
  }

  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('empleados')
      .update({ estado: 'inactivo' })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async activate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('empleados')
      .update({ estado: 'activo' })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async countActivos(): Promise<number> {
    const { count, error } = await this.supabase
      .from('empleados')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo');

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  /** Edge Function errors carry the useful message inside the response body. */
  private async extractFunctionError(error: unknown): Promise<string> {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (body?.error) return body.error;
      } catch {
        // Body was not JSON — fall through to the generic message
      }
    }
    return error instanceof Error ? error.message : 'No se pudo crear el empleado.';
  }
}
