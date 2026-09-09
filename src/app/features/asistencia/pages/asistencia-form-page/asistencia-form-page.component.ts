import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpleadoService } from '../../../empleados/services/empleado.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { HoursFormatPipe } from '../../../../shared/pipes/hours-format.pipe';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { calculateWorkedHours, todayISO } from '../../../../shared/utils/time-calculator.util';

@Component({
  selector: 'app-asistencia-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, BackButtonComponent, HoursFormatPipe],
  templateUrl: './asistencia-form-page.component.html',
  styleUrl: './asistencia-form-page.component.scss',
})
export default class AsistenciaFormPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private empleadoService = inject(EmpleadoService);
  private asistenciaService = inject(AsistenciaService);
  private toast = inject(ToastService);

  readonly isAdmin = this.authService.isAdmin;

  empleados = signal<Empleado[]>([]);
  loadState = signal<AsyncState>('idle');
  submitState = signal<AsyncState>('idle');
  horasCalculadas = signal(0);
  registroId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    empleado_id: ['', [Validators.required]],
    fecha: [todayISO(), [Validators.required]],
    hora_entrada: ['08:00', [Validators.required]],
    hora_salida: ['17:00', [Validators.required]],
    minutos_almuerzo: [60, [Validators.required, Validators.min(0), Validators.max(240)]],
    notas: [''],
  });

  get f() {
    return this.form.controls;
  }

  get isEditMode(): boolean {
    return this.registroId() !== null;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar registro' : 'Registrar asistencia';
  }

  ngOnInit(): void {
    this.recalculate();
    this.form.valueChanges.subscribe(() => this.recalculate());
    void this.init();
  }

  private async init(): Promise<void> {
    this.loadState.set('loading');
    try {
      if (this.isAdmin()) {
        this.empleados.set(await this.empleadoService.getAll());
      } else {
        // Colaborador can only register their own attendance
        const ownId = this.authService.empleadoId();
        if (ownId) {
          this.form.patchValue({ empleado_id: ownId });
        }
        this.form.controls.empleado_id.disable();
      }

      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.registroId.set(id);
        await this.loadRegistro(id);
      }

      this.loadState.set('success');
    } catch {
      this.loadState.set('error');
      this.toast.error('No se pudo cargar la información.');
    }
  }

  private async loadRegistro(id: string): Promise<void> {
    const registro = await this.asistenciaService.getById(id);
    if (!registro) {
      this.toast.error('Registro no encontrado.');
      this.router.navigate(['/asistencia']);
      return;
    }

    this.form.patchValue({
      empleado_id: registro.empleado_id,
      fecha: registro.fecha,
      hora_entrada: registro.hora_entrada,
      hora_salida: registro.hora_salida ?? '',
      minutos_almuerzo: registro.minutos_almuerzo,
      notas: registro.notas ?? '',
    });
    // Employee and date identify the record; changing them would break the
    // unique(empleado_id, fecha) constraint semantics for an edit.
    this.form.controls.empleado_id.disable();
    this.form.controls.fecha.disable();
    this.recalculate();
  }

  private recalculate(): void {
    const v = this.form.getRawValue();
    this.horasCalculadas.set(
      calculateWorkedHours(v.hora_entrada, v.hora_salida, Number(v.minutos_almuerzo))
    );
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitState() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const horas = calculateWorkedHours(v.hora_entrada, v.hora_salida, Number(v.minutos_almuerzo));

    if (horas <= 0) {
      this.toast.error('La hora de salida debe ser posterior a la de entrada.');
      return;
    }
    if (!v.empleado_id) {
      this.toast.error('Selecciona un empleado.');
      return;
    }

    this.submitState.set('loading');

    try {
      if (this.isEditMode) {
        await this.asistenciaService.update(this.registroId()!, {
          hora_entrada: v.hora_entrada,
          hora_salida: v.hora_salida,
          minutos_almuerzo: Number(v.minutos_almuerzo),
          horas_trabajadas: horas,
          notas: v.notas || null,
        });
        this.toast.success('Registro actualizado.');
      } else {
        await this.asistenciaService.create({
          empleado_id: v.empleado_id,
          fecha: v.fecha,
          hora_entrada: v.hora_entrada,
          hora_salida: v.hora_salida,
          minutos_almuerzo: Number(v.minutos_almuerzo),
          horas_trabajadas: horas,
          notas: v.notas || undefined,
        });
        this.toast.success(`Asistencia registrada: ${horas} horas.`);
      }

      this.submitState.set('success');
      this.resetForm();
      this.router.navigate(['/asistencia']);
    } catch (error) {
      this.submitState.set('error');
      this.toast.error(error instanceof Error ? error.message : 'Error al guardar el registro.');
    }
  }

  private resetForm(): void {
    const ownId = this.isAdmin() ? '' : (this.authService.empleadoId() ?? '');
    this.form.reset({
      empleado_id: ownId,
      fecha: todayISO(),
      hora_entrada: '08:00',
      hora_salida: '17:00',
      minutos_almuerzo: 60,
      notas: '',
    });
    this.recalculate();
  }
}
