export const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// bcrypt considera até 72 bytes; rejeitar entradas maiores evita truncamento silencioso.
export const senhaValida = (senha) => senha.length >= 8
  && Buffer.byteLength(senha, 'utf8') <= 72 && /[A-Za-z]/.test(senha) && /\d/.test(senha);

export function objetoBody(req, _res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(Object.assign(new Error('Corpo inválido.'), { status: 400 }));
  }
  return next();
}
