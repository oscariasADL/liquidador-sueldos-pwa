import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  Liquidacion,
  LiquidacionCreate,
  LiquidacionConEmpleado,
} from '../../../core/models/liquidacion.model';

@Injectable({ providedIn: 'root' })
export class LiquidacionService {
  private supabase = inject(SupabaseService).supabase;

  async getAll(): Promise<LiquidacionConEmpleado[]> {
    const { data, error } = await this.supabase
      .from('liquidaciones')
      .select('*, empleado:empleados(nombre, documento)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as LiquidacionConEmpleado[];
  }

  async getById(id: string): Promise<LiquidacionConEmpleado | null> {
    const { data, error } = await this.supabase
      .from('liquidaciones')
      .select('*, empleado:empleados(nombre, documento)')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as LiquidacionConEmpleado;
  }

  async create(liquidacion: LiquidacionCreate): Promise<Liquidacion> {
    const { data, error } = await this.supabase
      .from('liquidaciones')
      .insert(liquidacion)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async marcarPagado(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('liquidaciones')
      .update({ estado: 'pagado' })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async updateSyncStatus(
    id: string,
    status: 'synced' | 'failed',
    syncError?: string
  ): Promise<void> {
    const update: Record<string, unknown> = {
      sheets_sync_status: status,
    };
    if (status === 'synced') {
      update['sheets_synced_at'] = new Date().toISOString();
      update['sheets_sync_error'] = null;
    }
    if (status === 'failed' && syncError) {
      update['sheets_sync_error'] = syncError;
    }

    const { error } = await this.supabase
      .from('liquidaciones')
      .update(update)
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getPendientes(): Promise<{ count: number; total: number }> {
    const { data, error } = await this.supabase
      .from('liquidaciones')
      .select('total_pagar')
      .eq('estado', 'pendiente');

    if (error) throw new Error(error.message);
    const items = data ?? [];
    return {
      count: items.length,
      total: items.reduce((sum, l) => sum + Number(l.total_pagar), 0),
    };
  }

  async getTotalMes(): Promise<number> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('liquidaciones')
      .select('total_pagar')
      .gte('created_at', firstDay);

    if (error) throw new Error(error.message);
    return (data ?? []).reduce((sum, l) => sum + Number(l.total_pagar), 0);
  }
}
