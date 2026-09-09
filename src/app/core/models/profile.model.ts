export type UserRole = 'admin' | 'colaborador';

export interface Profile {
  user_id: string;
  role: UserRole;
  empleado_id: string | null;
  created_at: string;
  updated_at: string;
}
