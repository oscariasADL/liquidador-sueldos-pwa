import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { RegistroAsistencia } from '../../../../core/models/asistencia.model';
import { DesgloseDia, LiquidacionConEmpleado } from '../../../../core/models/liquidacion.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../../asistencia/services/asistencia.service';
import { LiquidacionService } from '../../services/liquidacion.service';
import { SheetsSyncService } from '../../../../core/services/sheets-sync.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { isOvertime } from '../../../../shared/utils/time-calculator.util';

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
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);
  private liquidacionService = inject(LiquidacionService);
  private sheetsSyncService = inject(SheetsSyncService);
  private toast = inject(ToastService);

  empleados = signal<Empleado[]>([]);
  desglose = signal<DesgloseDia[]>([]);
  historial = signal<LiquidacionConEmpleado[]>([]);
  loadState = signal<AsyncState>('idle');
  calcState = signal<AsyncState>('idle');
  saveState = signal<AsyncState>('idle');

  totalHoras = signal(0);
  valorHora = signal(0);
  totalPagar = signal(0);

  private selectedEmpleadoObj: Empleado | null = null;

  form = this.fb.nonNullable.group({
    empleado_id: ['', [Validators.required]],
    fecha_inicio: ['', [Validators.required]],
    fecha_fin: ['', [Validators.required]],
    notas: [''],
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    this.loadState.set('loading');
    try {
      const [empleados, historial] = await Promise.all([
        this.empleadoService.getAll(),
        this.liquidacionService.getAll(),
      ]);
      this.empleados.set(empleados);
      this.historial.set(historial);
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

    this.calcState.set('loading');
    this.desglose.set([]);

    try {
      const v = this.form.getRawValue();
      this.selectedEmpleadoObj = this.empleados().find((e) => e.id === v.empleado_id) ?? null;

      if (!this.selectedEmpleadoObj) {
        this.toast.error('Empleado no encontrado.');
        this.calcState.set('error');
        return;
      }

      const registros = await this.asistenciaService.getByEmpleado(
        v.empleado_id,
        v.fecha_inicio,
        v.fecha_fin
      );

      if (registros.length === 0) {
        this.toast.error('No hay registros de asistencia en el período seleccionado.');
        this.calcState.set('error');
        return;
      }

      const des: DesgloseDia[] = registros
        .filter((r): r is RegistroAsistencia & { hora_salida: string } => !!r.hora_salida)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((r) => ({
          fecha: r.fecha,
          hora_entrada: r.hora_entrada,
          hora_salida: r.hora_salida,
          minutos_almuerzo: r.minutos_almuerzo,
          horas_trabajadas: r.horas_trabajadas ?? 0,
          es_hora_extra: isOvertime(r.horas_trabajadas ?? 0),
        }));

      const total = des.reduce((sum, d) => sum + d.horas_trabajadas, 0);
      const valorH = this.selectedEmpleadoObj.valor_hora;

      this.desglose.set(des);
      this.totalHoras.set(Math.round(total * 100) / 100);
      this.valorHora.set(valorH);
      this.totalPagar.set(Math.round(total * valorH));
      this.calcState.set('success');
    } catch (err) {
      this.calcState.set('error');
      this.toast.error('Error al calcular liquidación.');
    }
  }

  async guardarLiquidacion(): Promise<void> {
    if (this.saveState() === 'loading' || !this.selectedEmpleadoObj) return;

    this.saveState.set('loading');

    try {
      const v = this.form.getRawValue();

      const liquidacion = await this.liquidacionService.create({
        empleado_id: v.empleado_id,
        fecha_inicio: v.fecha_inicio,
        fecha_fin: v.fecha_fin,
        total_horas: this.totalHoras(),
        valor_hora: this.valorHora(),
        total_pagar: this.totalPagar(),
        notas: v.notas || undefined,
      });

      this.toast.success('Liquidación guardada correctamente.');

      // Sync with Google Sheets (non-blocking)
      this.sheetsSyncService
        .syncLiquidacion({
          liquidacion_id: liquidacion.id,
          empleado_nombre: this.selectedEmpleadoObj.nombre,
          empleado_documento: this.selectedEmpleadoObj.documento,
          fecha_inicio: v.fecha_inicio,
          fecha_fin: v.fecha_fin,
          total_horas: this.totalHoras(),
          valor_hora: this.valorHora(),
          total_pagar: this.totalPagar(),
          estado: liquidacion.estado,
          fecha_liquidacion: liquidacion.created_at,
        })
        .then((result) => {
          if (result.success) {
            this.toast.show('Sincronizado con Google Sheets.', 'info');
          } else {
            this.toast.show('Sheets sync falló. Se puede reintentar después.', 'warning');
          }
          this.loadHistorial();
        });

      // Reset form and reload
      this.desglose.set([]);
      this.form.reset();
      this.saveState.set('success');
      await this.loadHistorial();
    } catch (err) {
      this.saveState.set('error');
      this.toast.error('Error al guardar liquidación.');
    }
  }

  private async loadHistorial(): Promise<void> {
    try {
      this.historial.set(await this.liquidacionService.getAll());
    } catch {
      // Silent fail — historial is non-critical
    }
  }
}
