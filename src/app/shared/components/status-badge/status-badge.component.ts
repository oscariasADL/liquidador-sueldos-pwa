import { Component, Input } from '@angular/core';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const VARIANT_MAP: Record<string, BadgeVariant> = {
  // Empleado estado
  activo: 'success',
  inactivo: 'neutral',
  // Liquidacion estado
  pendiente: 'warning',
  pagado: 'success',
  // Sheets sync status
  pending: 'warning',
  synced: 'success',
  failed: 'error',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="'badge--' + variant">{{ label }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      text-transform: capitalize;
      white-space: nowrap;
      line-height: 1;

      &--success {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }
      &--warning {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      &--error {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      &--info {
        background: rgba(6, 182, 212, 0.15);
        color: #06b6d4;
      }
      &--neutral {
        background: rgba(148, 163, 184, 0.15);
        color: #94a3b8;
      }
    }
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status = '';

  get label(): string {
    return this.status;
  }

  get variant(): BadgeVariant {
    return VARIANT_MAP[this.status] ?? 'neutral';
  }
}
