export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  documento: string;
  telefono: string;
  rol: 'solicitante' | 'analista' | 'admin';
}

export interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}
