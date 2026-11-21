import { dinheiroParaApi } from './formatos.js';

export function validarFormularioLancamento(form, editando = false) {
  const campos = {};
  const valor = Number(dinheiroParaApi(form.valor));
  if (!form.descricao.trim() || form.descricao.trim().length > 120) campos.descricao = 'Informe uma descrição com até 120 caracteres.';
  if (!Number.isFinite(valor) || valor <= 0 || valor > 9999999999.99) campos.valor = 'Informe um valor positivo de até 9.999.999.999,99.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data) || !Number.isFinite(Date.parse(`${form.data}T00:00:00Z`))
    || new Date(`${form.data}T00:00:00Z`).toISOString().slice(0, 10) !== form.data || form.data.startsWith('0000')) campos.data = 'Informe uma data válida.';
  if (!form.categoria_id) campos.categoria_id = 'Selecione uma categoria.';
  if (!form.fonte_destino_id) campos.fonte_destino_id = 'Selecione uma fonte ou destino.';
  const parcelas = Number(form.total_parcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) campos.total_parcelas = 'Use de 1 a 48 parcelas.';
  else if (!editando && parcelas > Math.round(valor * 100)) campos.total_parcelas = 'Cada parcela precisa valer pelo menos um centavo.';
  return campos;
}
