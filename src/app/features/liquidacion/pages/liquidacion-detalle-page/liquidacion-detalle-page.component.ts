import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DesgloseDia, LiquidacionConEmpleado } from '../../../../core/models/liquidacion.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LiquidacionService } from '../../services/liquidacion.service';
import { AsistenciaService } from '../../../asistencia/services/asistencia.service';
import { SheetsSyncService } from '../../../../core/services/sheets-sync.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { isOvertime } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-liquidacion-detalle-page',
  standalone: true,
  imports: [
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    BackButtonComponent,
    HoursFormatPipe,
    CurrencyCopPipe,
  ],
  templateUrl: './liquidacion-detalle-page.component.html',
  styleUrl: './liquidacion-detalle-page.component.scss',
})
export default class LiquidacionDetallePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private liquidacionService = inject(LiquidacionService);
  private asistenciaService = inject(AsistenciaService);
  private sheetsSyncService = inject(SheetsSyncService);
  private toast = inject(ToastService);

  readonly isAdmin = this.authService.isAdmin;

  liquidacion = signal<LiquidacionConEmpleado | null>(null);
  desglose = signal<DesgloseDia[]>([]);
  state = signal<AsyncState>('idle');
  actionState = signal<AsyncState>('idle');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      const liq = await this.liquidacionService.getById(id);
      if (!liq) {
        this.state.set('error');
        return;
      }
      this.liquidacion.set(liq);

      const registros = await this.asistenciaService.getByEmpleado(
        liq.empleado_id,
        liq.fecha_inicio,
        liq.fecha_fin
      );

      this.desglose.set(
        registros
          .filter((r) => r.hora_salida)
          .map((r) => ({
            fecha: r.fecha,
            hora_entrada: r.hora_entrada,
            hora_salida: r.hora_salida as string,
            minutos_almuerzo: r.minutos_almuerzo,
            horas_trabajadas: Number(r.horas_trabajadas ?? 0),
            es_hora_extra: isOvertime(Number(r.horas_trabajadas ?? 0)),
          }))
      );
      this.state.set('success');
    } catch {
      this.state.set('error');
      this.toast.error('Error al cargar la liquidación.');
    }
  }

  print(): void {
    window.print();
  }

  async marcarPagado(): Promise<void> {
    const liq = this.liquidacion();
    if (!liq) return;

    this.actionState.set('loading');
    try {
      await this.liquidacionService.marcarPagado(liq.id);
      this.liquidacion.set({ ...liq, estado: 'pagado' });
      this.toast.success('Liquidación marcada como pagada.');
      this.actionState.set('success');
    } catch {
      this.actionState.set('error');
      this.toast.error('Error al actualizar el estado.');
    }
  }

  async retrySheetsSync(): Promise<void> {
    const liq = this.liquidacion();
    if (!liq) return;

    this.actionState.set('loading');
    const result = await this.sheetsSyncService.syncLiquidacion({
      liquidacion_id: liq.id,
      empleado_nombre: liq.empleado?.nombre ?? '',
      empleado_documento: liq.empleado?.documento ?? '',
      fecha_inicio: liq.fecha_inicio,
      fecha_fin: liq.fecha_fin,
      total_horas: liq.total_horas,
      valor_hora: liq.valor_hora,
      total_pagar: liq.total_pagar,
      estado: liq.estado,
      fecha_liquidacion: liq.created_at,
    });

    if (result.success) {
      this.liquidacion.set({ ...liq, sheets_sync_status: 'synced' });
      this.toast.success('Sincronizado con Google Sheets.');
    } else {
      this.toast.error(result.error ?? 'La sincronización falló.');
    }
    this.actionState.set('idle');
  }
}
