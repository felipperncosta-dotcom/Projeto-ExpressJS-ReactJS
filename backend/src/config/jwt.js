import 'dotenv/config';
import jwt from 'jsonwebtoken';

const segredo = process.env.JWT_SECRET;
if (!segredo || Buffer.byteLength(segredo, 'utf8') < 32
  || segredo === 'substitua-por-um-segredo-longo-e-aleatorio') {
  throw new Error('Configure JWT_SECRET com um segredo próprio de pelo menos 32 bytes.');
}

export function criarToken(usuarioId) {
  return jwt.sign({}, segredo, {
    algorithm: 'HS256', subject: String(usuarioId), expiresIn: '1h',
  });
}

export function verificarToken(token) {
  const payload = jwt.verify(token, segredo, { algorithms: ['HS256'] });
  if (typeof payload !== 'object' || !Number.isInteger(payload.exp)) {
    throw new Error('Token sem expiração válida.');
  }
  return payload;
}
