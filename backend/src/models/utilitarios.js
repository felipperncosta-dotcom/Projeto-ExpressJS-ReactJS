// Valida CPF pelos dois dígitos verificadores.
export function cpfValido(cpf) {
  const digitos = String(cpf ?? '').replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (base, pesoInicial) => {
    const soma = base.split('').reduce((total, digito, indice) => (
      total + Number(digito) * (pesoInicial - indice)
    ), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(digitos.slice(0, 9), 10) === Number(digitos[9])
    && calcularDigito(digitos.slice(0, 10), 11) === Number(digitos[10]);
}

// Limite de NUMERIC(12,2). Converte texto decimal diretamente em centavos.
export function valorEmCentavos(valor) {
  if (!['string', 'number'].includes(typeof valor)) throw new TypeError('Valor inválido.');
  const partes = String(valor).trim().match(/^(\d{1,10})(?:\.(\d{1,2}))?$/);
  if (!partes) throw new TypeError('Use até duas casas decimais e ponto decimal.');
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > 999999999999) {
    throw new TypeError('Valor fora do intervalo permitido.');
  }
  return centavos;
}

export function centavosParaDecimal(centavos) {
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > 999999999999) {
    throw new TypeError('Centavos inválidos.');
  }
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}
