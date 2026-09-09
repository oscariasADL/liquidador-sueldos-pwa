import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { DesgloseDia, LiquidacionConEmpleado } from '../../../../core/models/liquidacion.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../../asistencia/services/asistencia.service';
import { LiquidacionService } from '../../services/liquidacion.service';
import { SheetsSyncService } from '../../../../core/services/sheets-sync.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { firstDayOfMonthISO, isOvertime, todayISO } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-liquidacion-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
    HoursFormatPipe,
    CurrencyCopPipe,
  ],
  templateUrl: './liquidacion-page.component.html',
  styleUrl: './liquidacion-page.component.scss',
})
export default class LiquidacionPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);
  private liquidacionService = inject(LiquidacionService);
  private sheetsSyncService = inject(SheetsSyncService);
  private toast = inject(ToastService);

  readonly isAdmin = this.authService.isAdmin;

  empleados = signal<Empleado[]>([]);
  desglose = signal<DesgloseDia[]>([]);
  historial = signal<LiquidacionConEmpleado[]>([]);
  loadState = signal<AsyncState>('idle');
  calcState = signal<AsyncState>('idle');
  saveState = signal<AsyncState>('idle');

  totalHoras = signal(0);
  valorHora = signal(0);
  totalPagar = signal(0);

  private selectedEmpleado: Empleado | null = null;

  form = this.fb.nonNullable.group({
    empleado_id: ['', [Validators.required]],
    fecha_inicio: [firstDayOfMonthISO(), [Validators.required]],
    fecha_fin: [todayISO(), [Validators.required]],
    notas: [''],
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    void this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    this.loadState.set('loading');
    try {
      const requests: Promise<unknown>[] = [this.liquidacionService.getAll()];
      if (this.isAdmin()) {
        requests.push(this.empleadoService.getAll());
      }

      const [historial, empleados] = await Promise.all(requests);
      this.historial.set(historial as LiquidacionConEmpleado[]);
      if (empleados) {
        this.empleados.set(empleados as Empleado[]);
      }
      this.loadState.set('success');
    } catch {
      this.loadState.set('error');
    }
  }

  async calcular(): Promise<void> {
    if (this.form.invalid || this.calcState() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    if (v.fecha_fin < v.fecha_inicio) {
      this.toast.error('La fecha final debe ser posterior a la inicial.');
      return;
    }

    this.calcState.set('loading');
    this.desglose.set([]);

    try {
      this.selectedEmpleado = this.empleados().find((e) => e.id === v.empleado_id) ?? null;
      if (!this.selectedEmpleado) {
        this.toast.error('Empleado no encontrado.');
        this.calcState.set('error');
        return;
      }

      const registros = await this.asistenciaService.getByEmpleado(
        v.empleado_id,
        v.fecha_inicio,
        v.fecha_fin
      );

      const dias: DesgloseDia[] = registros
        .filter((r) => r.hora_salida)
        .map((r) => ({
          fecha: r.fecha,
          hora_entrada: r.hora_entrada,
          hora_salida: r.hora_salida as string,
          minutos_almuerzo: r.minutos_almuerzo,
          horas_trabajadas: Number(r.horas_trabajadas ?? 0),
          es_hora_extra: isOvertime(Number(r.horas_trabajadas ?? 0)),
        }));

      if (dias.length === 0) {
        this.toast.error('No hay registros de asistencia en el período seleccionado.');
        this.calcState.set('error');
        return;
      }

      const total = dias.reduce((sum, d) => sum + d.horas_trabajadas, 0);
      const valorH = Number(this.selectedEmpleado.valor_hora);

      this.desglose.set(dias);
      this.totalHoras.set(Math.round(total * 100) / 100);
      this.valorHora.set(valorH);
      this.totalPagar.set(Math.round(total * valorH));
      this.calcState.set('success');
    } catch {
      this.calcState.set('error');
      this.toast.error('Error al calcular la liquidación.');
    }
  }

  async guardarLiquidacion(): Promise<void> {
    if (this.saveState() === 'loading' || !this.selectedEmpleado) return;

    this.saveState.set('loading');
    const v = this.form.getRawValue();
    const empleado = this.selectedEmpleado;

    try {
      const liquidacion = await this.liquidacionService.create({
        empleado_id: v.empleado_id,
        fecha_inicio: v.fecha_inicio,
        fecha_fin: v.fecha_fin,
        total_horas: this.totalHoras(),
        valor_hora: this.valorHora(),
        total_pagar: this.totalPagar(),
        notas: v.notas || undefined,
      });

      this.toast.success('Liquidación guardada.');
      this.saveState.set('success');

      // Sheets sync must not block the main flow
      void this.sheetsSyncService
        .syncLiquidacion({
          liquidacion_id: liquidacion.id,
          empleado_nombre: empleado.nombre,
          empleado_documento: empleado.documento,
          fecha_inicio: v.fecha_inicio,
          fecha_fin: v.fecha_fin,
          total_horas: this.totalHoras(),
          valor_hora: this.valorHora(),
          total_pagar: this.totalPagar(),
          estado: liquidacion.estado,
          fecha_liquidacion: liquidacion.created_at,
        })
        .then((result) => {
          if (!result.success) {
            this.toast.show('Google Sheets no respondió. Puedes reintentar el envío.', 'warning');
          }
          void this.refreshHistorial();
        });

      this.desglose.set([]);
      this.form.reset({
        empleado_id: '',
        fecha_inicio: firstDayOfMonthISO(),
        fecha_fin: todayISO(),
        notas: '',
      });

      this.router.navigate(['/liquidacion', liquidacion.id]);
    } catch {
      this.saveState.set('error');
      this.toast.error('Error al guardar la liquidación.');
    }
  }

  private async refreshHistorial(): Promise<void> {
    try {
      this.historial.set(await this.liquidacionService.getAll());
    } catch {
      // Historial is non-critical; keep the current list on failure
    }
  }
}
