import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly profile = signal<Profile | null>(null);
  readonly isLoading = signal(true);

  readonly role = computed<UserRole | null>(() => this.profile()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly isColaborador = computed(() => this.role() === 'colaborador');
  readonly empleadoId = computed(() => this.profile()?.empleado_id ?? null);

  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.initAuthListener();
  }

  /** Resolves once the initial session and profile have been loaded. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private async initAuthListener(): Promise<void> {
    const { data } = await this.supabaseService.supabase.auth.getSession();
    const user = data.session?.user ?? null;
    this.currentUser.set(user);

    if (user) {
      await this.loadProfile(user.id);
    }
    this.isLoading.set(false);

    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      this.currentUser.set(nextUser);

      if (event === 'SIGNED_OUT' || !nextUser) {
        this.profile.set(null);
        return;
      }
      // Reload profile only when the user actually changes
      if (nextUser.id !== this.profile()?.user_id) {
        void this.loadProfile(nextUser.id);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error.message);
      this.profile.set(null);
      return;
    }
    this.profile.set(data as Profile | null);
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabaseService.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: this.getErrorMessage(error.message) };
    }

    if (data.user) {
      this.currentUser.set(data.user);
      await this.loadProfile(data.user.id);
    }

    if (!this.profile()) {
      await this.supabaseService.supabase.auth.signOut();
      this.currentUser.set(null);
      return {
        error: 'Tu cuenta no tiene un perfil asignado. Contacta al administrador.',
      };
    }

    this.router.navigate([this.isAdmin() ? '/dashboard' : '/asistencia']);
    return { error: null };
  }

  async signOut(): Promise<void> {
    await this.supabaseService.supabase.auth.signOut();
    this.profile.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /** Landing route for the current role. */
  homeRoute(): string {
    return this.isAdmin() ? '/dashboard' : '/asistencia';
  }

  private getErrorMessage(message: string): string {
    if (message.includes('Invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (message.includes('Email not confirmed')) {
      return 'El correo no ha sido confirmado. Contacta al administrador.';
    }
    return 'Error al iniciar sesión. Intenta de nuevo.';
  }
}
