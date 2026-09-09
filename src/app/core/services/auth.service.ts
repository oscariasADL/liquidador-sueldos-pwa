import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(true);

  constructor() {
    this.initAuthListener();
  }

  private async initAuthListener(): Promise<void> {
    // Check initial session
    const { data } = await this.supabaseService.supabase.auth.getSession();
    this.currentUser.set(data.session?.user ?? null);
    this.isLoading.set(false);

    // Listen for auth changes
    this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabaseService.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: this.getErrorMessage(error.message) };
    }

    this.router.navigate(['/dashboard']);
    return { error: null };
  }

  async signOut(): Promise<void> {
    await this.supabaseService.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  get isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  private getErrorMessage(message: string): string {
    if (message.includes('Invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (message.includes('Email not confirmed')) {
      return 'El correo no ha sido confirmado. Revisa tu bandeja de entrada.';
    }
    return 'Error al iniciar sesión. Intenta de nuevo.';
  }
}
