import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Empleado } from '../../../../core/models/empleado.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CurrencyCopPipe } from '../../../../shared/pipes/currency-cop.pipe';

@Component({
  selector: 'app-empleado-card',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent, CurrencyCopPipe],
  template: `
    <div class="emp-card card">
      <div class="emp-card__header">
        <div class="emp-card__avatar">{{ initials }}</div>
        <div class="emp-card__info">
          <h3 class="emp-card__name">{{ empleado.nombre }}</h3>
          <span class="emp-card__doc">{{ empleado.documento }}</span>
        </div>
        <app-status-badge [status]="empleado.estado" />
      </div>

      <div class="emp-card__body">
        <div class="emp-card__field">
          <span class="emp-card__label">Cargo</span>
          <span class="emp-card__value">{{ empleado.cargo || 'Sin asignar' }}</span>
        </div>
        <div class="emp-card__field">
          <span class="emp-card__label">Correo</span>
          <span class="emp-card__value emp-card__value--email">{{ empleado.email }}</span>
        </div>
        <div class="emp-card__field">
          <span class="emp-card__label">Valor hora</span>
          <span class="emp-card__value emp-card__value--highlight">{{ empleado.valor_hora | currencyCop }}</span>
        </div>
      </div>

      <div class="emp-card__actions">
        <a class="btn-ghost btn-sm" [routerLink]="['/empleados', empleado.id, 'editar']">
          Editar
        </a>
        @if (empleado.estado === 'activo') {
          <button class="btn-ghost btn-sm" (click)="onDeactivate.emit(empleado)">
            Desactivar
          </button>
        } @else {
          <button class="btn-ghost btn-sm" (click)="onActivate.emit(empleado)">
            Activar
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'styles/variables' as *;

    .emp-card {
      display: flex;
      flex-direction: column;
      gap: $space-4;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: $shadow-lg;
      }

      &__header {
        display: flex;
        align-items: center;
        gap: $space-3;
      }

      &__avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: $radius-lg;
        background: $color-primary-light;
        color: $color-primary;
        font-weight: $font-weight-bold;
        font-size: $font-size-sm;
        flex-shrink: 0;
      }

      &__info {
        flex: 1;
        min-width: 0;
      }

      &__name {
        font-size: $font-size-base;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &__doc {
        font-size: $font-size-xs;
        color: $text-muted;
      }

      &__body {
        display: flex;
        flex-direction: column;
        gap: $space-2;
      }

      &__field {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      &__label {
        font-size: $font-size-xs;
        color: $text-muted;
      }

      &__value {
        font-size: $font-size-sm;
        color: $text-secondary;
        min-width: 0;
        text-align: right;

        &--highlight {
          color: $color-success;
          font-weight: $font-weight-semibold;
        }

        &--email {
          font-size: $font-size-xs;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      &__actions {
        display: flex;
        gap: $space-2;
        padding-top: $space-3;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
    }
  `,
})
export class EmpleadoCardComponent {
  @Input({ required: true }) empleado!: Empleado;
  @Output() onDeactivate = new EventEmitter<Empleado>();
  @Output() onActivate = new EventEmitter<Empleado>();

  get initials(): string {
    return this.empleado.nombre
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
