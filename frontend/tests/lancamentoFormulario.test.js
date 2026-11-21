import test from 'node:test';
import assert from 'node:assert/strict';
import { validarFormularioLancamento } from '../src/components/lancamentoFormulario.js';

const form = { descricao: 'Compra', valor: '100,00', data: '2026-11-21', categoria_id: '10', fonte_destino_id: '20', total_parcelas: 3 };

test('formulário aceita compra parcelada válida', () => {
  assert.deepEqual(validarFormularioLancamento(form), {});
});

test('formulário rejeita datas inexistentes, campos ausentes e valores fora do limite', () => {
  for (const data of ['', '2026-02-30', '2025-02-29', '0000-01-01']) assert.ok(validarFormularioLancamento({ ...form, data }).data);
  assert.ok(validarFormularioLancamento({ ...form, descricao: ' ' }).descricao);
  assert.ok(validarFormularioLancamento({ ...form, categoria_id: '' }).categoria_id);
  assert.ok(validarFormularioLancamento({ ...form, fonte_destino_id: '' }).fonte_destino_id);
  for (const valor of ['0,00', '10.000.000.000,00']) assert.ok(validarFormularioLancamento({ ...form, valor }).valor);
  for (const total_parcelas of [0, 49, 1.5]) assert.ok(validarFormularioLancamento({ ...form, total_parcelas }).total_parcelas);
});

test('valor de uma parcela editada não é confundido com o total da compra', () => {
  const pequena = { ...form, valor: '0,01' };
  assert.ok(validarFormularioLancamento(pequena).total_parcelas);
  assert.deepEqual(validarFormularioLancamento(pequena, true), {});
});
