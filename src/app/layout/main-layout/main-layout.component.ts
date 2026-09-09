import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `
    <app-navbar />
    <main class="main-content">
      <div class="container">
        <router-outlet />
      </div>
    </main>
    <app-toast />
  `,
  styles: `
    .main-content {
      padding-top: 1.5rem;
      // Extra bottom padding keeps the last card clear of the viewport edge
      // and of iOS home-indicator safe areas.
      padding-bottom: calc(3rem + env(safe-area-inset-bottom));
    }
  `,
})
export class MainLayoutComponent {}
