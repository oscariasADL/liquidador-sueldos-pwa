import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../../asistencia/services/asistencia.service';
import { LiquidacionService } from '../../../liquidacion/services/liquidacion.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';
import { todayISO } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, CurrencyCopPipe],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <span class="text-muted">{{ today }}</span>
    </div>

    <div class="grid grid-4">
      <div class="card metric-card">
        <div class="metric-card__icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">👥</div>
        <div>
          <small class="text-muted">Empleados activos</small>
          @if (state() === 'loading') {
            <app-loading-spinner [size]="20" [inline]="true" />
          } @else {
            <h2>{{ empleadosActivos() }}</h2>
          }
        </div>
      </div>

      <div class="card metric-card">
        <div class="metric-card__icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📋</div>
        <div>
          <small class="text-muted">Asistencias hoy</small>
          @if (state() === 'loading') {
            <app-loading-spinner [size]="20" [inline]="true" />
          } @else {
            <h2>{{ asistenciasHoy() }}</h2>
          }
        </div>
      </div>

      <div class="card metric-card">
        <div class="metric-card__icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</div>
        <div>
          <small class="text-muted">Liquidaciones pendientes</small>
          @if (state() === 'loading') {
            <app-loading-spinner [size]="20" [inline]="true" />
          } @else {
            <h2>{{ pendientes().count }}</h2>
            <small class="text-muted">{{ pendientes().total | currencyCop }}</small>
          }
        </div>
      </div>

      <div class="card metric-card">
        <div class="metric-card__icon" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;">💰</div>
        <div>
          <small class="text-muted">Total liquidado (mes)</small>
          @if (state() === 'loading') {
            <app-loading-spinner [size]="20" [inline]="true" />
          } @else {
            <h2>{{ totalMes() | currencyCop }}</h2>
          }
        </div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top: 1.5rem;">
      <a class="card action-card" routerLink="/empleados">
        <h3>Empleados</h3>
        <p class="text-muted">Gestionar empleados</p>
      </a>
      <a class="card action-card" routerLink="/asistencia">
        <h3>Asistencia</h3>
        <p class="text-muted">Registrar asistencia diaria</p>
      </a>
      <a class="card action-card" routerLink="/liquidacion">
        <h3>Liquidación</h3>
        <p class="text-muted">Liquidar sueldos</p>
      </a>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;
    @use 'styles/mixins' as *;

    .metric-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;

      &__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 12px;
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      > div:last-child {
        min-width: 0;
        overflow: hidden;
      }

      h2 {
        margin: 0.25rem 0 0;
        font-size: 1.5rem;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .action-card {
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-lg;
      }

      h3 {
        margin-bottom: 0.25rem;
      }
    }
  `,
})
export default class DashboardPageComponent implements OnInit {
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);
  private liquidacionService = inject(LiquidacionService);

  state = signal<AsyncState>('idle');
  empleadosActivos = signal(0);
  asistenciasHoy = signal(0);
  pendientes = signal<{ count: number; total: number }>({ count: 0, total: 0 });
  totalMes = signal(0);

  today = todayISO();

  ngOnInit(): void {
    this.loadMetrics();
  }

  private async loadMetrics(): Promise<void> {
    this.state.set('loading');
    try {
      const [activos, hoy, pend, mes] = await Promise.all([
        this.empleadoService.countActivos(),
        this.asistenciaService.countByFecha(todayISO()),
        this.liquidacionService.getPendientes(),
        this.liquidacionService.getTotalMes(),
      ]);

      this.empleadosActivos.set(activos);
      this.asistenciasHoy.set(hoy);
      this.pendientes.set(pend);
      this.totalMes.set(mes);
      this.state.set('success');
    } catch {
      this.state.set('error');
    }
  }
}
