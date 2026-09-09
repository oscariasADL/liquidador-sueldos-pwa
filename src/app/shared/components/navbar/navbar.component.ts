import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private authService = inject(AuthService);

  menuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Empleados', path: '/empleados', icon: 'users' },
    { label: 'Asistencia', path: '/asistencia', icon: 'clock' },
    { label: 'Liquidación', path: '/liquidacion', icon: 'calculator' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.authService.signOut();
  }
}
