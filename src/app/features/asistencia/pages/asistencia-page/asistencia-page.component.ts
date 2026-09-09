import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { isOvertime, todayISO, daysAgoISO } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-asistencia-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent, HoursFormatPipe],
  templateUrl: './asistencia-page.component.html',
  styleUrl: './asistencia-page.component.scss',
})
export default class AsistenciaPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);

  readonly isAdmin = this.authService.isAdmin;
  readonly registros = this.asistenciaService.registros;
  readonly tableState = this.asistenciaService.state;

  empleados = signal<Empleado[]>([]);
  empleadosState = signal<AsyncState>('idle');

  filters = this.fb.nonNullable.group({
    empleadoId: [''],
    fechaInicio: [daysAgoISO(30)],
    fechaFin: [todayISO()],
  });

  readonly totalHoras = computed(() => {
    const total = this.registros().reduce((sum, r) => sum + Number(r.horas_trabajadas ?? 0), 0);
    return Math.round(total * 100) / 100;
  });

  readonly diasRegistrados = computed(() => this.registros().length);

  ngOnInit(): void {
    if (this.isAdmin()) {
      void this.loadEmpleados();
    }
    void this.applyFilters();
  }

  private async loadEmpleados(): Promise<void> {
    this.empleadosState.set('loading');
    try {
      this.empleados.set(await this.empleadoService.getAll());
      this.empleadosState.set('success');
    } catch {
      this.empleadosState.set('error');
    }
  }

  async applyFilters(): Promise<void> {
    const { empleadoId, fechaInicio, fechaFin } = this.filters.getRawValue();
    await this.asistenciaService.load({
      empleadoId: empleadoId || null,
      fechaInicio,
      fechaFin,
    });
  }

  isOvertime(horas: number | null): boolean {
    return isOvertime(horas ?? 0);
  }
}
