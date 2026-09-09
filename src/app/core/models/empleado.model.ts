export interface Empleado {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  cargo: string | null;
  valor_hora: number;
  estado: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
}

/** Payload sent to the create-empleado Edge Function. */
export interface EmpleadoCreate {
  nombre: string;
  documento: string;
  email: string;
  password: string;
  cargo?: string;
  valor_hora: number;
}

export interface EmpleadoUpdate {
  nombre?: string;
  documento?: string;
  cargo?: string | null;
  valor_hora?: number;
  estado?: 'activo' | 'inactivo';
}
