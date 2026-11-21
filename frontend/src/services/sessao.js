export const TOKEN_KEY = 'financas_token';
export const EVENTO_SESSAO_EXPIRADA = 'auth:expired';

// A leitura local serve apenas para expirar a interface. A API valida a assinatura.
export function expiracaoToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}
