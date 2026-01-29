/**
 * Authentication Utilities
 * Centralizes JWT parsing and validation for all API routes
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Types
export interface UserPayload {
  userId: string;
  tenantId: string;
}

export interface AuthResult {
  success: true;
  data: UserPayload;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

export type AuthValidationResult = AuthResult | AuthError;

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(result: AuthValidationResult): result is AuthError {
  return result.success === false;
}

/**
 * Type guard to check if auth result is successful
 */
export function isAuthSuccess(result: AuthValidationResult): result is AuthResult {
  return result.success === true;
}

/**
 * Get JWT secret from environment
 * Throws if not configured (fail-fast in production)
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
}

/**
 * Extract and validate user from JWT token in Authorization header
 *
 * @param request - Next.js request object
 * @returns AuthValidationResult with user data or error
 *
 * @example
 * const auth = validateAuthHeader(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const { userId, tenantId } = auth.data;
 */
export function validateAuthHeader(request: NextRequest): AuthValidationResult {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return {
        success: false,
        error: 'Token de autenticação não fornecido',
        status: 401,
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Formato de token inválido',
        status: 401,
      };
    }

    const token = authHeader.substring(7);

    if (!token || token.split('.').length !== 3) {
      return {
        success: false,
        error: 'Token JWT malformado',
        status: 401,
      };
    }

    // Verify and decode token
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { userId?: string; tenantId?: string };

    if (!decoded.userId) {
      return {
        success: false,
        error: 'Token inválido: userId não encontrado',
        status: 401,
      };
    }

    return {
      success: true,
      data: {
        userId: decoded.userId,
        tenantId: decoded.tenantId || decoded.userId,
      },
    };
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Sessão expirada. Faça login novamente.',
        status: 401,
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Token de autenticação inválido',
        status: 401,
      };
    }

    console.error('Auth validation error:', error);
    return {
      success: false,
      error: 'Erro ao validar autenticação',
      status: 500,
    };
  }
}

/**
 * Simple extraction without full verification (for backwards compatibility)
 * WARNING: Use validateAuthHeader for secure routes
 *
 * @deprecated Use validateAuthHeader instead
 */
export function extractUserFromToken(authHeader: string): UserPayload | null {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    if (!payload.userId) {
      return null;
    }

    return {
      userId: payload.userId,
      tenantId: payload.tenantId || payload.userId,
    };
  } catch {
    return null;
  }
}

/**
 * Check if request has valid auth header format (quick check)
 */
export function hasAuthHeader(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return !!authHeader && authHeader.startsWith('Bearer ');
}
