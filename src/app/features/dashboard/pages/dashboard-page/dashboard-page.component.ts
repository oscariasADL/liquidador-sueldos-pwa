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
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
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
    void this.loadMetrics();
  }

  async loadMetrics(): Promise<void> {
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
