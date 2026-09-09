import { Component, Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = this.nextId++;
    this.messages.update((msgs) => [...msgs, { id, message, type }]);

    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  dismiss(id: number): void {
    this.messages.update((msgs) => msgs.filter((m) => m.id !== id));
  }
}

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (msg of toastService.messages(); track msg.id) {
        <div class="toast" [class]="'toast--' + msg.type" role="alert">
          <span class="toast__message">{{ msg.message }}</span>
          <button class="toast__close" (click)="toastService.dismiss(msg.id)" aria-label="Cerrar">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed;
      top: 80px;
      right: 16px;
      z-index: 400;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
      width: calc(100% - 32px);
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: slideIn 0.25s ease;
      font-size: 0.875rem;

      &--success {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      &--error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
      &--info {
        background: rgba(6, 182, 212, 0.2);
        color: #06b6d4;
      }
      &--warning {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      &__message {
        flex: 1;
      }

      &__close {
        background: none;
        border: none;
        color: inherit;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;
        min-width: 32px;
        min-height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover { opacity: 1; }
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `,
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
