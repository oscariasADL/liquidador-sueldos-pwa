import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { LiquidacionService } from '../../features/liquidacion/services/liquidacion.service';

export interface SheetsSyncPayload {
  liquidacion_id: string;
  empleado_nombre: string;
  empleado_documento: string;
  fecha_inicio: string;
  fecha_fin: string;
  total_horas: number;
  valor_hora: number;
  total_pagar: number;
  estado: string;
  fecha_liquidacion: string;
}

@Injectable({ providedIn: 'root' })
export class SheetsSyncService {
  private supabase = inject(SupabaseService).supabase;
  private liquidacionService = inject(LiquidacionService);

  async syncLiquidacion(payload: SheetsSyncPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.functions.invoke('sync-sheets', {
        body: payload,
      });

      if (error) {
        await this.liquidacionService.updateSyncStatus(
          payload.liquidacion_id,
          'failed',
          error.message
        );
        return { success: false, error: error.message };
      }

      await this.liquidacionService.updateSyncStatus(payload.liquidacion_id, 'synced');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al sincronizar.';
      await this.liquidacionService.updateSyncStatus(
        payload.liquidacion_id,
        'failed',
        message
      );
      return { success: false, error: message };
    }
  }
}
