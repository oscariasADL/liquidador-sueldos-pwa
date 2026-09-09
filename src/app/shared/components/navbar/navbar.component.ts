import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/profile.model';

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
  { label: 'Empleados', path: '/empleados', roles: ['admin'] },
  { label: 'Asistencia', path: '/asistencia', roles: ['admin', 'colaborador'] },
  { label: 'Liquidación', path: '/liquidacion', roles: ['admin', 'colaborador'] },
];

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

  readonly role = this.authService.role;
  readonly isAdmin = this.authService.isAdmin;

  readonly navItems = computed(() => {
    const currentRole = this.role();
    if (!currentRole) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(currentRole));
  });

  readonly homeRoute = computed(() => (this.isAdmin() ? '/dashboard' : '/asistencia'));

  readonly roleLabel = computed(() => (this.isAdmin() ? 'Administrador' : 'Colaborador'));

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    void this.authService.signOut();
  }
}
