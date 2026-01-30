import { User } from '../types';

/**
 * Verifica se o usuário tem perfil de administrador
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Verifica se o usuário pode acessar configurações de integrações
 */
export const canAccessIntegrations = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Verifica se o usuário pode visualizar informações técnicas do sistema
 */
export const canViewTechInfo = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Verifica se o usuário pode gerenciar outros usuários
 */
export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user);
};
