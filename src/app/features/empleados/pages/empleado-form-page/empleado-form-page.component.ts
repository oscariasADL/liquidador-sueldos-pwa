import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../services/empleado.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-empleado-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './empleado-form-page.component.html',
  styleUrl: './empleado-form-page.component.scss',
})
export default class EmpleadoFormPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);

  isEditMode = false;
  empleadoId: string | null = null;
  state = signal<AsyncState>('idle');
  loadState = signal<AsyncState>('idle');

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    documento: ['', [Validators.required, Validators.minLength(5)]],
    cargo: [''],
    valor_hora: [5000, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.empleadoId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.empleadoId;

    if (this.isEditMode && this.empleadoId) {
      this.loadEmpleado(this.empleadoId);
    }
  }

  private async loadEmpleado(id: string): Promise<void> {
    this.loadState.set('loading');
    try {
      const emp = await this.empleadoService.getById(id);
      if (emp) {
        this.form.patchValue({
          nombre: emp.nombre,
          documento: emp.documento,
          cargo: emp.cargo ?? '',
          valor_hora: emp.valor_hora,
        });
      }
      this.loadState.set('success');
    } catch {
      this.loadState.set('error');
      this.toast.error('Error al cargar empleado.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.state() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('loading');

    try {
      const formValue = this.form.getRawValue();
      const payload = {
        nombre: formValue.nombre.trim(),
        documento: formValue.documento.trim(),
        cargo: formValue.cargo?.trim() || undefined,
        valor_hora: formValue.valor_hora,
      };

      if (this.isEditMode && this.empleadoId) {
        await this.empleadoService.update(this.empleadoId, payload);
        this.toast.success('Empleado actualizado correctamente.');
      } else {
        await this.empleadoService.create(payload);
        this.toast.success('Empleado creado correctamente.');
      }

      this.state.set('success');
      this.router.navigate(['/empleados']);
    } catch (err) {
      this.state.set('error');
      const message = err instanceof Error ? err.message : 'Error al guardar empleado.';
      this.toast.error(message);
    }
  }

  get f() {
    return this.form.controls;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar Empleado' : 'Nuevo Empleado';
  }
}
