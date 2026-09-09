import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Navigates to an explicit route when provided, otherwise falls back to
 * browser history. Explicit routes keep navigation predictable after redirects.
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  template: `
    <button type="button" class="back-btn" (click)="goBack()" [attr.aria-label]="ariaLabel">
      <span class="back-btn__arrow" aria-hidden="true">←</span>
      <span class="back-btn__text">{{ label }}</span>
    </button>
  `,
  styles: `
    @use 'styles/variables' as *;

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: $space-2;
      min-height: 44px;
      padding: $space-2 $space-3 $space-2 $space-2;
      margin-bottom: $space-3;
      background: transparent;
      border: none;
      border-radius: $radius-md;
      color: $text-secondary;
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      cursor: pointer;
      transition: color $transition-fast, background $transition-fast;

      &:hover {
        color: $text-primary;
        background: $glass-bg;
      }

      &:focus-visible {
        outline: 2px solid $color-primary;
        outline-offset: 2px;
      }

      &__arrow {
        font-size: $font-size-lg;
        line-height: 1;
      }
    }

    @media print {
      .back-btn { display: none; }
    }
  `,
})
export class BackButtonComponent {
  private router = inject(Router);

  @Input() label = 'Volver';
  @Input() ariaLabel = 'Volver a la pantalla anterior';
  /** Explicit destination. When omitted, uses browser history. */
  @Input() to?: string;

  goBack(): void {
    if (this.to) {
      this.router.navigate([this.to]);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/']);
  }
}
