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

export function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const utc = new Date(`${data}T00:00:00.000Z`);
  return ano > 0 && utc.getUTCFullYear() === ano && utc.getUTCMonth() === mes - 1 && utc.getUTCDate() === dia;
}

export function idPositivo(valor) {
  if (!['string', 'number'].includes(typeof valor) || !/^\d+$/.test(String(valor))) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 && numero <= 2147483647 ? numero : null;
}
