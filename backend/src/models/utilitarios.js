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
