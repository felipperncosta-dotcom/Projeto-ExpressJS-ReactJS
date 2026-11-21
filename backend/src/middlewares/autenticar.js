import { verificarToken } from '../config/jwt.js';

export function autenticar(req, res, next) {
  const partes = (req.headers.authorization ?? '').split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) {
    return res.status(401).json({ erro: 'Token não informado ou inválido.' });
  }
  try {
    const payload = verificarToken(partes[1]);
    const id = Number(payload.sub);
    if (!/^\d+$/.test(payload.sub ?? '') || !Number.isSafeInteger(id) || id < 1) {
      throw new Error('Usuário inválido no token.');
    }
    // A identidade vem exclusivamente do token, nunca do corpo ou da URL.
    req.usuarioId = id;
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
