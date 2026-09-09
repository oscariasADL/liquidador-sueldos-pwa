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
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async create(empleado: EmpleadoCreate): Promise<Empleado> {
    const { data, error } = await this.supabase
      .from('empleados')
      .insert(empleado)
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
}
