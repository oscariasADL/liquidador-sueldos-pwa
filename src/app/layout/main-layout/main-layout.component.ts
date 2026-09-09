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
      padding-bottom: 2rem;
      min-height: calc(100vh - 64px);
    }
  `,
})
export class MainLayoutComponent {}
