import test from 'node:test';
import assert from 'node:assert/strict';
import { mascaraDinheiro, dinheiroParaApi } from '../src/components/formatos.js';

test('máscara monetária mantém os centavos ao enviar limites à API', () => {
  for (const [entrada, exibido, api] of [
    ['300050', '3.000,50', '3000.50'], ['1', '0,01', '0.01'],
    ['999999999999', '9.999.999.999,99', '9999999999.99'], ['', '0,00', '0.00'],
  ]) {
    assert.equal(mascaraDinheiro(entrada), exibido);
    assert.equal(dinheiroParaApi(exibido), api);
  }
});
