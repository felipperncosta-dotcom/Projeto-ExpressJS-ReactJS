import test from 'node:test';
import assert from 'node:assert/strict';
import { valorEmCentavos, centavosParaDecimal } from '../src/models/utilitarios.js';
import { dataValida } from '../src/middlewares/validacao.js';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-lancamentos-123';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { criarToken } = await import('../src/config/jwt.js');

test('valores monetários e datas de lançamentos', () => {
  for (const [valor, centavos] of [['0.01', 1], [100.25, 10025], ['9999999999.99', 999999999999]]) {
    assert.equal(valorEmCentavos(valor), centavos);
    assert.equal(valorEmCentavos(centavosParaDecimal(centavos)), centavos);
  }
  for (const valor of [true, [], {}, null, '', 0, -1, 1.001, '10,00', '10000000000.00', Infinity]) {
    assert.throws(() => valorEmCentavos(valor));
  }
  assert.equal(dataValida('2024-02-29'), true);
  for (const data of ['2025-02-29', '2026-04-31', '0000-01-01', '2026-13-01', '21/11/2026']) assert.equal(dataValida(data), false);
});

test('lançamentos HTTP com banco simulado', async (t) => {
  const original = pool.query;
  const fila = [];
  const esperar = (sql, parametros, rows = [], erro) => fila.push({ sql, parametros, rows, erro });
  pool.query = async (sql, parametros) => {
    const item = fila.shift();
    assert.ok(item, `Consulta inesperada: ${sql}`);
    assert.match(sql, item.sql);
    assert.deepEqual(parametros, item.parametros);
    if (item.erro) throw Object.assign(new Error('Falha simulada'), { code: item.erro });
    return { rows: item.rows, rowCount: item.rows.length };
  };
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/lancamentos`;
  const token = criarToken(1);
  const enviar = (method, caminho = '', body, autenticado = true) => fetch(base + caminho, {
    method, headers: { 'Content-Type': 'application/json', ...(autenticado ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const dados = { tipo: 'saida', descricao: ' Mercado ', valor: '50.25', data: '2026-11-21', categoria_id: 10, fonte_destino_id: 20 };
  const relacoesSql = /c\.id = \$1 AND f\.id = \$2[\s\S]*c\.usuario_id = \$3 AND f\.usuario_id = \$3/;
  try {
    await t.test('exige token para listar, detalhar e criar', async () => {
      for (const [method, caminho] of [['GET', ''], ['GET', '/1'], ['POST', '']]) {
        assert.equal((await enviar(method, caminho, undefined, false)).status, 401);
      }
    });
    await t.test('valida dados e recusa parcelamento nesta etapa', async () => {
      for (const body of [[], {}, { ...dados, valor: 1.001 }, { ...dados, data: '2026-02-30' },
        { ...dados, descricao: 'a'.repeat(121) }, { ...dados, categoria_id: true },
        { ...dados, fonte_destino_id: [20] }, { ...dados, total_parcelas: 2 }]) {
        assert.equal((await enviar('POST', '', body)).status, 400);
      }
    });
    await t.test('recusa relações de terceiros e tipos incompatíveis', async () => {
      esperar(relacoesSql, [10, 20, 1]);
      assert.equal((await enviar('POST', '', dados)).status, 404);
      for (const relacao of [
        { categoria_tipo: 'entrada', fonte_destino_tipo: 'conta' },
        { categoria_tipo: 'saida', fonte_destino_tipo: 'renda' },
      ]) {
        esperar(relacoesSql, [10, 20, 1], [relacao]);
        assert.equal((await enviar('POST', '', dados)).status, 400);
      }
      esperar(relacoesSql, [10, 20, 1], [{ categoria_tipo: 'entrada', fonte_destino_tipo: 'cartao_credito' }]);
      assert.equal((await enviar('POST', '', { ...dados, tipo: 'entrada' })).status, 400);
    });
    await t.test('grava valor exato e ignora usuário enviado no corpo', async () => {
      esperar(relacoesSql, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'conta' }]);
      esperar(/INSERT INTO lancamentos/, [1, 'saida', 'Mercado', '50.25', '2026-11-21', 10, 20], [{ id: 30, ...dados, descricao: 'Mercado', total_parcelas: 1 }]);
      const resposta = await enviar('POST', '', { ...dados, usuario_id: 999 });
      assert.equal(resposta.status, 201);
      assert.equal((await resposta.json()).lancamentos[0].id, 30);
    });
    await t.test('trata exclusão da relação entre validação e gravação', async () => {
      esperar(relacoesSql, [10, 20, 1], [{ categoria_tipo: 'saida', fonte_destino_tipo: 'conta' }]);
      esperar(/INSERT INTO lancamentos/, [1, 'saida', 'Mercado', '50.25', '2026-11-21', 10, 20], [], '23503');
      assert.equal((await enviar('POST', '', dados)).status, 404);
    });
    await t.test('detalhe filtra pelo usuário do token', async () => {
      esperar(/WHERE l\.id = \$1 AND l\.usuario_id = \$2/, [30, 1], [{ id: 30 }]);
      assert.equal((await enviar('GET', '/30')).status, 200);
      esperar(/WHERE l\.id = \$1 AND l\.usuario_id = \$2/, [99, 1]);
      assert.equal((await enviar('GET', '/99')).status, 404);
    });
    await t.test('valida filtros antes de consultar o banco', async () => {
      for (const query of ['?inicio=2026-02-30', '?inicio=2026-12-01&fim=2026-11-01', '?pagina=0', '?pagina=1&pagina=2', '?limite=101', '?tipo=outro', '?categoriaId=abc', '?fonteDestinoId=-1']) {
        assert.equal((await enviar('GET', query)).status, 400, query);
      }
    });
    await t.test('aplica todos os filtros e pagina sem limitar os totais', async () => {
      const parametros = [1, '2026-11-01', '2026-11-30', 'saida', 10, 20];
      const where = /l\.usuario_id = \$1 AND l\.data >= \$2::date AND l\.data <= \$3::date AND l\.tipo = \$4 AND l\.categoria_id = \$5 AND l\.fonte_destino_id = \$6/;
      esperar(where, parametros, [{ totalEntradas: '0.00', totalSaidas: '100.50', saldo: '-100.50', total: 11 }]);
      esperar(/LIMIT \$7 OFFSET \$8/, [...parametros, 10, 10], [{ id: 30 }]);
      const resposta = await enviar('GET', '?inicio=2026-11-01&fim=2026-11-30&tipo=saida&categoriaId=10&fonteDestinoId=20&pagina=2&limite=10');
      assert.equal(resposta.status, 200);
      const resultado = await resposta.json();
      assert.equal(resultado.pagina, 2);
      assert.equal(resultado.totalPaginas, 2);
      assert.equal(resultado.total, 11);
      assert.equal(resultado.lancamentos.length, 1);
      assert.equal(resultado.saldo, '-100.50');
    });
    await t.test('usa mês corrente e paginação padrão em lista vazia', async () => {
      const agora = new Date();
      const inicio = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1)).toISOString().slice(0, 10);
      const fim = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 0)).toISOString().slice(0, 10);
      esperar(/SUM\(valor\)/, [1, inicio, fim], [{ totalEntradas: '0', totalSaidas: '0', saldo: '0', total: 0 }]);
      esperar(/LIMIT \$4 OFFSET \$5/, [1, inicio, fim, 20, 0]);
      const resposta = await enviar('GET');
      assert.equal(resposta.status, 200);
      const resultado = await resposta.json();
      assert.deepEqual(resultado.lancamentos, []);
      assert.equal(resultado.totalPaginas, 0);
    });
    assert.equal(fila.length, 0);
  } finally {
    pool.query = original;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
