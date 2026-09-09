import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrapper" [class.inline]="inline">
      <div class="spinner" [style.width.px]="size" [style.height.px]="size"></div>
    </div>
  `,
  styles: `
    .spinner-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;

      &.inline {
        padding: 0;
        display: inline-flex;
      }
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class LoadingSpinnerComponent {
  @Input() size = 32;
  @Input() inline = false;
}
