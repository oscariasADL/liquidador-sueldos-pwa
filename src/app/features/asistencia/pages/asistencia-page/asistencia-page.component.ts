import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Empleado } from '../../../../core/models/empleado.model';
import { RegistroAsistencia } from '../../../../core/models/asistencia.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { calculateWorkedHours, isOvertime, todayISO } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-asistencia-page',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, HoursFormatPipe],
  templateUrl: './asistencia-page.component.html',
  styleUrl: './asistencia-page.component.scss',
})
export default class AsistenciaPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);
  private toast = inject(ToastService);

  empleados = signal<Empleado[]>([]);
  registros = signal<RegistroAsistencia[]>([]);
  selectedEmpleado = signal<string>('');
  loadState = signal<AsyncState>('idle');
  tableState = signal<AsyncState>('idle');
  submitState = signal<AsyncState>('idle');
  editingId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    fecha: [todayISO(), [Validators.required]],
    hora_entrada: ['08:00', [Validators.required]],
    hora_salida: ['17:00', [Validators.required]],
    minutos_almuerzo: [60, [Validators.required, Validators.min(0)]],
    notas: [''],
  });

  horasCalculadas = computed(() => {
    const v = this.form.getRawValue();
    return calculateWorkedHours(v.hora_entrada, v.hora_salida, v.minutos_almuerzo);
  });

  // Date range for table: last 30 days
  private fechaFin = todayISO();
  private fechaInicio = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  ngOnInit(): void {
    this.loadEmpleados();
    // Re-calculate on form value changes
    this.form.valueChanges.subscribe(() => {
      // Trigger computed recalculation by reading the signal
      this.horasCalculadas();
    });
  }

  async loadEmpleados(): Promise<void> {
    this.loadState.set('loading');
    try {
      this.empleados.set(await this.empleadoService.getAll());
      this.loadState.set('success');
    } catch {
      this.loadState.set('error');
    }
  }

  async onEmpleadoChange(empleadoId: string): Promise<void> {
    this.selectedEmpleado.set(empleadoId);
    this.editingId.set(null);
    this.resetForm();
    if (empleadoId) {
      await this.loadRegistros(empleadoId);
    } else {
      this.registros.set([]);
    }
  }

  async loadRegistros(empleadoId: string): Promise<void> {
    this.tableState.set('loading');
    try {
      const data = await this.asistenciaService.getByEmpleado(
        empleadoId,
        this.fechaInicio,
        this.fechaFin
      );
      this.registros.set(data);
      this.tableState.set('success');
    } catch {
      this.tableState.set('error');
    }
  }

  editRegistro(reg: RegistroAsistencia): void {
    this.editingId.set(reg.id);
    this.form.patchValue({
      fecha: reg.fecha,
      hora_entrada: reg.hora_entrada,
      hora_salida: reg.hora_salida ?? '',
      minutos_almuerzo: reg.minutos_almuerzo,
      notas: reg.notas ?? '',
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitState() === 'loading' || !this.selectedEmpleado()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState.set('loading');

    try {
      const v = this.form.getRawValue();
      const horas = calculateWorkedHours(v.hora_entrada, v.hora_salida, v.minutos_almuerzo);

      if (horas <= 0) {
        this.toast.error('La hora de salida debe ser posterior a la de entrada.');
        this.submitState.set('error');
        return;
      }

      if (this.editingId()) {
        await this.asistenciaService.update(this.editingId()!, {
          hora_entrada: v.hora_entrada,
          hora_salida: v.hora_salida,
          minutos_almuerzo: v.minutos_almuerzo,
          horas_trabajadas: horas,
          notas: v.notas || null,
        });
        this.toast.success('Registro actualizado.');
      } else {
        await this.asistenciaService.create({
          empleado_id: this.selectedEmpleado(),
          fecha: v.fecha,
          hora_entrada: v.hora_entrada,
          hora_salida: v.hora_salida,
          minutos_almuerzo: v.minutos_almuerzo,
          horas_trabajadas: horas,
          notas: v.notas || undefined,
        });
        this.toast.success('Asistencia registrada.');
      }

      this.submitState.set('success');
      this.editingId.set(null);
      this.resetForm();
      await this.loadRegistros(this.selectedEmpleado());
    } catch (err) {
      this.submitState.set('error');
      const message = err instanceof Error ? err.message : 'Error al guardar registro.';
      this.toast.error(message);
    }
  }

  isOvertime(horas: number | null): boolean {
    return isOvertime(horas ?? 0);
  }

  private resetForm(): void {
    this.form.reset({
      fecha: todayISO(),
      hora_entrada: '08:00',
      hora_salida: '17:00',
      minutos_almuerzo: 60,
      notas: '',
    });
  }
}
