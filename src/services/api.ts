import { ServiceOrder, AppUser } from '../types';

// Base URL configurável via variável de ambiente Vite
const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Cliente HTTP genérico com tratamento robusto de erros e timeout
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// SERVIÇO DE ORDENS DE SERVIÇO (OS) - SINCRONIZAÇÃO EM TEMPO REAL
// ============================================================================
export const ordensApi = {
  /**
   * Busca todas as Ordens de Serviço atualizadas diretamente do backend/planilha (mais de 70 registros)
   */
  getAll: async (): Promise<{ success: boolean; orders: ServiceOrder[]; total: number; source: string }> => {
    return request<{ success: boolean; orders: ServiceOrder[]; total: number; source: string }>('/api/ordens');
  },

  /**
   * Salva/Cadastra uma nova Ordem de Serviço e propaga para todas as máquinas
   */
  create: async (order: Partial<ServiceOrder>): Promise<{ success: boolean; order: ServiceOrder }> => {
    return request<{ success: boolean; order: ServiceOrder }>('/api/ordens', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },

  /**
   * Atualiza uma OS existente (validação de faturamento, edição de itens ou status)
   */
  update: async (id: string, updates: Partial<ServiceOrder>): Promise<{ success: boolean; order?: ServiceOrder; message?: string }> => {
    return request<{ success: boolean; order?: ServiceOrder; message?: string }>(`/api/ordens/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Exclui uma OS com registro de motivo e supervisor
   */
  delete: async (id: string, reason?: string, supervisorName?: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(`/api/ordens/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, supervisorName }),
    });
  },
};

// ============================================================================
// SERVIÇO DE GESTÃO DE USUÁRIOS E SENHAS
// ============================================================================
export const usersApi = {
  /**
   * Lista todos os usuários cadastrados centralizadamente no servidor Express
   */
  getAll: async (): Promise<{ success: boolean; users: AppUser[] }> => {
    return request<{ success: boolean; users: AppUser[] }>('/api/users');
  },

  /**
   * Cria um novo usuário com perfil e permissões
   */
  create: async (userData: Partial<AppUser> & { name: string; email: string; password?: string }): Promise<{ success: boolean; user: AppUser; message: string }> => {
    return request<{ success: boolean; user: AppUser; message: string }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Atualiza dados/permissões de um usuário
   */
  update: async (id: string, updates: Partial<AppUser>): Promise<{ success: boolean; user: AppUser; message: string }> => {
    return request<{ success: boolean; user: AppUser; message: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Exclui um usuário do sistema
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Reset de senha por Administrador
   */
  adminResetPassword: async (payload: {
    adminEmail: string;
    adminPassword?: string;
    targetUserId: string;
    newTemporaryPassword?: string;
  }): Promise<{ success: boolean; message: string; temporaryPassword?: string }> => {
    return request<{ success: boolean; message: string; temporaryPassword?: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
