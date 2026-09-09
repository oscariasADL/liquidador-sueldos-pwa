import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../services/empleado.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-empleado-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent, BackButtonComponent],
  templateUrl: './empleado-form-page.component.html',
  styleUrl: './empleado-form-page.component.scss',
})
export default class EmpleadoFormPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);

  empleadoId = signal<string | null>(null);
  state = signal<AsyncState>('idle');
  loadState = signal<AsyncState>('idle');

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    documento: ['', [Validators.required, Validators.minLength(5)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    cargo: [''],
    valor_hora: [5000, [Validators.required, Validators.min(1)]],
  });

  get f() {
    return this.form.controls;
  }

  get isEditMode(): boolean {
    return this.empleadoId() !== null;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Editar empleado' : 'Nuevo empleado';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.empleadoId.set(id);
      // Credentials belong to the auth account and are not edited here
      this.form.controls.email.disable();
      this.form.controls.password.disable();
      void this.loadEmpleado(id);
    }
  }

  private async loadEmpleado(id: string): Promise<void> {
    this.loadState.set('loading');
    try {
      const emp = await this.empleadoService.getById(id);
      if (!emp) {
        this.toast.error('Empleado no encontrado.');
        this.router.navigate(['/empleados']);
        return;
      }
      this.form.patchValue({
        nombre: emp.nombre,
        documento: emp.documento,
        email: emp.email,
        cargo: emp.cargo ?? '',
        valor_hora: emp.valor_hora,
      });
      this.loadState.set('success');
    } catch {
      this.loadState.set('error');
      this.toast.error('Error al cargar el empleado.');
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.state() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('loading');
    const v = this.form.getRawValue();

    try {
      if (this.isEditMode) {
        await this.empleadoService.update(this.empleadoId()!, {
          nombre: v.nombre.trim(),
          documento: v.documento.trim(),
          cargo: v.cargo?.trim() || null,
          valor_hora: Number(v.valor_hora),
        });
        this.toast.success('Empleado actualizado.');
      } else {
        await this.empleadoService.create({
          nombre: v.nombre.trim(),
          documento: v.documento.trim(),
          email: v.email.trim().toLowerCase(),
          password: v.password,
          cargo: v.cargo?.trim() || undefined,
          valor_hora: Number(v.valor_hora),
        });
        this.toast.success('Empleado creado con acceso de colaborador.');
      }

      this.state.set('success');
      this.router.navigate(['/empleados']);
    } catch (error) {
      this.state.set('error');
      this.toast.error(error instanceof Error ? error.message : 'Error al guardar el empleado.');
    }
  }
}
