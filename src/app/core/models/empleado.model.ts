export interface Empleado {
  id: string;
  nombre: string;
  documento: string;
  cargo: string | null;
  valor_hora: number;
  estado: 'activo' | 'inactivo';
  created_at: string;
  updated_at: string;
}

export interface EmpleadoCreate {
  nombre: string;
  documento: string;
  cargo?: string;
  valor_hora?: number;
}

export interface EmpleadoUpdate {
  nombre?: string;
  documento?: string;
  cargo?: string | null;
  valor_hora?: number;
  estado?: 'activo' | 'inactivo';
}
