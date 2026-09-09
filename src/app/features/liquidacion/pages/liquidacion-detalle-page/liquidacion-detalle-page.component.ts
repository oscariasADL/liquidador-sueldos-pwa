import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LiquidacionConEmpleado, DesgloseDia } from '../../../../core/models/liquidacion.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { LiquidacionService } from '../../services/liquidacion.service';
import { AsistenciaService } from '../../../asistencia/services/asistencia.service';
import { SheetsSyncService } from '../../../../core/services/sheets-sync.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { isOvertime } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-liquidacion-detalle-page',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, StatusBadgeComponent, HoursFormatPipe, CurrencyCopPipe],
  template: `
    <div class="page-header">
      <h1>Detalle de Liquidación</h1>
      <a class="btn-ghost" routerLink="/liquidacion">← Volver</a>
    </div>

    @if (state() === 'loading') {
      <app-loading-spinner />
    } @else if (!liquidacion()) {
      <div class="card" style="text-align: center;">
        <p class="text-error">Liquidación no encontrada.</p>
      </div>
    } @else {
      <div class="grid grid-2" style="margin-bottom: 1.5rem;">
        <div class="card">
          <small>Empleado</small>
          <h3>{{ liquidacion()!.empleado?.nombre }}</h3>
          <p class="text-muted">{{ liquidacion()!.empleado?.documento }}</p>
        </div>
        <div class="card">
          <small>Período</small>
          <h3>{{ liquidacion()!.fecha_inicio }} — {{ liquidacion()!.fecha_fin }}</h3>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <app-status-badge [status]="liquidacion()!.estado" />
            <app-status-badge [status]="liquidacion()!.sheets_sync_status" />
          </div>
        </div>
      </div>

      @if (desglose().length > 0) {
        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="margin-bottom: 1rem;">Desglose diario</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Almuerzo</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                @for (d of desglose(); track d.fecha) {
                  <tr>
                    <td>{{ d.fecha }}</td>
                    <td>{{ d.hora_entrada }}</td>
                    <td>{{ d.hora_salida }}</td>
                    <td>{{ d.minutos_almuerzo }}m</td>
                    <td [style.color]="d.es_hora_extra ? '#f59e0b' : 'inherit'" [style.fontWeight]="d.es_hora_extra ? '600' : 'normal'">
                      {{ d.horas_trabajadas | hoursFormat }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="grid grid-3" style="margin-bottom: 1.5rem;">
        <div class="card" style="text-align: center;">
          <small>Total horas</small>
          <h2>{{ liquidacion()!.total_horas | hoursFormat }}</h2>
        </div>
        <div class="card" style="text-align: center;">
          <small>Valor hora</small>
          <h2>{{ liquidacion()!.valor_hora | currencyCop }}</h2>
        </div>
        <div class="card" style="text-align: center;">
          <small>Total a pagar</small>
          <h2 style="color: #10b981;">{{ liquidacion()!.total_pagar | currencyCop }}</h2>
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        @if (liquidacion()!.estado === 'pendiente') {
          <button class="btn-primary" (click)="marcarPagado()" [disabled]="actionState() === 'loading'">
            Marcar como pagado
          </button>
        }
        @if (liquidacion()!.sheets_sync_status === 'failed') {
          <button class="btn-ghost" (click)="retrySheetsSync()" [disabled]="actionState() === 'loading'">
            Reintentar sincronización Sheets
          </button>
        }
      </div>
    }
  `,
})
export default class LiquidacionDetallePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private liquidacionService = inject(LiquidacionService);
  private asistenciaService = inject(AsistenciaService);
  private sheetsSyncService = inject(SheetsSyncService);
  private toast = inject(ToastService);

  liquidacion = signal<LiquidacionConEmpleado | null>(null);
  desglose = signal<DesgloseDia[]>([]);
  state = signal<AsyncState>('idle');
  actionState = signal<AsyncState>('idle');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      const liq = await this.liquidacionService.getById(id);
      this.liquidacion.set(liq);

      if (liq) {
        const registros = await this.asistenciaService.getByEmpleado(
          liq.empleado_id,
          liq.fecha_inicio,
          liq.fecha_fin
        );
        this.desglose.set(
          registros
            .filter((r) => r.hora_salida)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map((r) => ({
              fecha: r.fecha,
              hora_entrada: r.hora_entrada,
              hora_salida: r.hora_salida!,
              minutos_almuerzo: r.minutos_almuerzo,
              horas_trabajadas: r.horas_trabajadas ?? 0,
              es_hora_extra: isOvertime(r.horas_trabajadas ?? 0),
            }))
        );
      }
      this.state.set('success');
    } catch {
      this.state.set('error');
      this.toast.error('Error al cargar liquidación.');
    }
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
      this.toast.error('Error al actualizar estado.');
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
      this.toast.error('Sincronización falló: ' + (result.error ?? ''));
    }
    this.actionState.set('idle');
  }
}
