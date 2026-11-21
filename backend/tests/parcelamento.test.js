import test from 'node:test';
import assert from 'node:assert/strict';
import { dividirParcelas, valorEmCentavos } from '../src/models/utilitarios.js';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-parcelas-12345';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { criarToken } = await import('../src/config/jwt.js');

test('parcelas preservam o total e concentram a sobra na primeira', () => {
  assert.deepEqual(dividirParcelas('100.00', 3), [3334, 3333, 3333]);
  assert.deepEqual(dividirParcelas('100.00', 6), [1670, 1666, 1666, 1666, 1666, 1666]);
  assert.deepEqual(dividirParcelas('0.03', 3), [1, 1, 1]);
  for (let quantidade = 1; quantidade <= 48; quantidade += 1) {
    const parcelas = dividirParcelas('9999999999.99', quantidade);
    assert.equal(parcelas.length, quantidade);
    assert.equal(parcelas.reduce((a, b) => a + b, 0), valorEmCentavos('9999999999.99'));
    assert.ok(parcelas.every(valor => Number.isSafeInteger(valor) && valor > 0));
  }
  for (const n of [0, 49, 1.5, true]) assert.throws(() => dividirParcelas('100.00', n));
  assert.throws(() => dividirParcelas('0.02', 3));
});

test('parcelamento, edição e exclusão HTTP com banco simulado', async (t) => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const fila = [];
  let liberacoes = 0;
  const esperar = (origem, sql, parametros, rows = [], erro) => fila.push({ origem, sql, parametros, rows, erro });
  const consultar = async (origem, sql, parametros) => {
    const item = fila.shift();
    assert.ok(item, `Consulta inesperada: ${sql}`);
    assert.equal(origem, item.origem);
    assert.match(sql, item.sql);
    if (typeof item.parametros === 'function') item.parametros(parametros);
    else assert.deepEqual(parametros, item.parametros);
    if (item.erro) throw Object.assign(new Error('Falha simulada'), { code: item.erro });
    return { rows: item.rows, rowCount: item.rows.length };
  };
  pool.query = (sql, parametros) => consultar('pool', sql, parametros);
  pool.connect = async () => ({ query: (sql, parametros) => consultar('transacao', sql, parametros), release: () => { liberacoes += 1; } });
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/lancamentos`;
  const token = criarToken(1);
  const enviar = (method, caminho = '', body, autenticado = true) => fetch(base + caminho, {
    method, headers: { 'Content-Type': 'application/json', ...(autenticado ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const dados = { tipo: 'saida', descricao: 'Compra', valor: '100.00', data: '2026-11-21', categoria_id: 10, fonte_destino_id: 20, total_parcelas: 3 };
  const relacoes = /c\.usuario_id = \$3 AND f\.usuario_id = \$3/;
  const buscar = /WHERE l\.id = \$1 AND l\.usuario_id = \$2/;
  const grupo = '48974119-77ea-4ff1-8a20-0d78c8cb3348';
  const parcela = { id: 30, total_parcelas: 3, parcela_atual: 2, grupo_parcelamento: grupo };
  try {
    await t.test('limites de parcelas e compatibilidade com cartão', async () => {
      for (const body of [{ ...dados, valor: '0.02' }, { ...dados, total_parcelas: true }, { ...dados, total_parcelas: null }, { ...dados, totalParcelas: 4 }]) {
        assert.equal((await enviar('POST', '', body)).status, 400);
      }
      esperar('pool', relacoes, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'conta' }]);
      assert.equal((await enviar('POST', '', dados)).status, 400);
    });
    await t.test('grava as três parcelas na mesma transação e no mesmo grupo', async () => {
      esperar('pool', relacoes, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'cartao_credito' }]);
      esperar('transacao', /^BEGIN$/, undefined);
      let grupoGerado;
      for (let i = 1; i <= 3; i += 1) {
        esperar('transacao', /INSERT INTO lancamentos/, parametros => {
          assert.deepEqual(parametros.slice(0, 9), [1, 'saida', 'Compra', i === 1 ? '33.34' : '33.33', '2026-11-21', 10, 20, i, 3]);
          assert.match(parametros[9], /^[a-f0-9-]{36}$/);
          if (i === 1) grupoGerado = parametros[9];
          assert.equal(parametros[9], grupoGerado);
        }, [{ id: 29 + i, parcela_atual: i }]);
      }
      esperar('transacao', /^COMMIT$/, undefined);
      const resposta = await enviar('POST', '', dados);
      assert.equal(resposta.status, 201);
      assert.equal((await resposta.json()).lancamentos.length, 3);
      assert.equal(liberacoes, 1);
    });
    await t.test('falha na segunda parcela executa rollback e libera conexão', async () => {
      esperar('pool', relacoes, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'cartao_credito' }]);
      esperar('transacao', /^BEGIN$/, undefined);
      esperar('transacao', /INSERT INTO lancamentos/, () => {}, [{ id: 30 }]);
      esperar('transacao', /INSERT INTO lancamentos/, () => {}, [], '23503');
      esperar('transacao', /^ROLLBACK$/, undefined);
      assert.equal((await enviar('POST', '', dados)).status, 404);
      assert.equal(liberacoes, 2);
    });
    await t.test('edição e exclusão exigem token e recusam registro de terceiro', async () => {
      for (const method of ['PUT', 'DELETE']) {
        assert.equal((await enviar(method, '/99', dados, false)).status, 401);
        esperar('pool', buscar, [99, 1]);
        assert.equal((await enviar(method, '/99', method === 'PUT' ? dados : undefined)).status, 404);
      }
    });
    await t.test('não permite mudar quantidade nem usar relação de terceiro ao editar', async () => {
      esperar('pool', buscar, [30, 1], [parcela]);
      assert.equal((await enviar('PUT', '/30', { ...dados, total_parcelas: 4 })).status, 400);
      esperar('pool', buscar, [30, 1], [parcela]);
      esperar('pool', relacoes, [10, 20, 1]);
      assert.equal((await enviar('PUT', '/30', dados)).status, 404);
    });
    await t.test('edita somente o valor da parcela sem exigir valor maior que quantidade', async () => {
      esperar('pool', buscar, [30, 1], [parcela]);
      esperar('pool', relacoes, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'cartao_credito' }]);
      esperar('pool', /UPDATE lancamentos[\s\S]*WHERE id = \$7 AND usuario_id = \$8/,
        ['saida', 'Compra', '0.01', '2026-11-21', 10, 20, 30, 1], [{ ...parcela, valor: '0.01' }]);
      const resposta = await enviar('PUT', '/30', { ...dados, valor: '0.01', grupo_parcelamento: 'ignorado', parcela_atual: 99 });
      assert.equal(resposta.status, 200);
      const alterada = (await resposta.json()).lancamento;
      assert.equal(alterada.grupo_parcelamento, grupo);
      assert.equal(alterada.parcela_atual, 2);
    });
    await t.test('exclui uma parcela ou o grupo sempre filtrando por usuário', async () => {
      esperar('pool', buscar, [30, 1], [parcela]);
      esperar('pool', /DELETE FROM lancamentos WHERE usuario_id = \$1 AND id = \$2/, [1, 30], [{}]);
      assert.equal((await enviar('DELETE', '/30')).status, 204);
      esperar('pool', buscar, [30, 1], [parcela]);
      esperar('pool', /DELETE FROM lancamentos WHERE usuario_id = \$1 AND grupo_parcelamento = \$2/, [1, grupo], [{}, {}, {}]);
      assert.equal((await enviar('DELETE', '/30?todasParcelas=true')).status, 204);
      assert.equal((await enviar('DELETE', '/30?todasParcelas=sim')).status, 400);
    });
    assert.equal(fila.length, 0);
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
