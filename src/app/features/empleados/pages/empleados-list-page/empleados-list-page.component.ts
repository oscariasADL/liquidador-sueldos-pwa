import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { AsyncState } from '../../../../core/models/async-state.model';
import { EmpleadoService } from '../../services/empleado.service';
import { EmpleadoCardComponent } from '../../components/empleado-card/empleado-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-empleados-list-page',
  standalone: true,
  imports: [RouterLink, EmpleadoCardComponent, LoadingSpinnerComponent],
  template: `
    <div class="page-header">
      <h1>Empleados</h1>
      <a class="btn-primary" routerLink="/empleados/nuevo">+ Nuevo Empleado</a>
    </div>

    @if (state() === 'loading') {
      <app-loading-spinner />
    } @else if (state() === 'error') {
      <div class="card" style="text-align: center;">
        <p class="text-error">Error al cargar empleados.</p>
        <button class="btn-ghost" style="margin-top: 1rem;" (click)="loadEmpleados()">
          Reintentar
        </button>
      </div>
    } @else if (empleados().length === 0) {
      <div class="card" style="text-align: center;">
        <p class="text-muted">No hay empleados registrados.</p>
        <a class="btn-primary" routerLink="/empleados/nuevo" style="margin-top: 1rem;">
          Crear primer empleado
        </a>
      </div>
    } @else {
      <div class="grid grid-3">
        @for (emp of empleados(); track emp.id) {
          <app-empleado-card
            [empleado]="emp"
            (onDeactivate)="deactivate($event)"
            (onActivate)="activate($event)"
          />
        }
      </div>
    }
  `,
})
export default class EmpleadosListPageComponent implements OnInit {
  private empleadoService = inject(EmpleadoService);
  private toast = inject(ToastService);

  empleados = signal<Empleado[]>([]);
  state = signal<AsyncState>('idle');

  ngOnInit(): void {
    this.loadEmpleados();
  }

  async loadEmpleados(): Promise<void> {
    this.state.set('loading');
    try {
      const data = await this.empleadoService.getAll();
      this.empleados.set(data);
      this.state.set('success');
    } catch {
      this.state.set('error');
    }
  }

  async deactivate(emp: Empleado): Promise<void> {
    if (!confirm(`¿Desactivar a ${emp.nombre}?`)) return;
    try {
      await this.empleadoService.deactivate(emp.id);
      this.toast.success(`${emp.nombre} desactivado.`);
      await this.loadEmpleados();
    } catch {
      this.toast.error('Error al desactivar empleado.');
    }
  }

  async activate(emp: Empleado): Promise<void> {
    try {
      await this.empleadoService.activate(emp.id);
      this.toast.success(`${emp.nombre} activado.`);
      await this.loadEmpleados();
    } catch {
      this.toast.error('Error al activar empleado.');
    }
  }
}
